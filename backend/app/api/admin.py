import re
import secrets
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from sqlalchemy import (
    MetaData,
    Table,
    delete,
    func,
    inspect,
    insert,
    select,
    text,
    update,
)

from app.core.config import settings
from app.db.database import engine

router = APIRouter()
security = HTTPBasic()


def _verify_admin(credentials: HTTPBasicCredentials = Depends(security)) -> None:
    if not settings.admin_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")

    expected_username = settings.db_user
    expected_password = settings.db_password or ""

    username_ok = secrets.compare_digest(credentials.username, expected_username)
    password_ok = secrets.compare_digest(credentials.password or "", expected_password)

    if not (username_ok and password_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid admin credentials",
            headers={"WWW-Authenticate": "Basic"},
        )


def _normalize_sql_query(query: str) -> str:
    normalized = query.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="query is empty")

    if ";" in normalized.rstrip(";"):
        raise HTTPException(status_code=400, detail="multiple statements not allowed")

    lowered = normalized.lower()
    if not re.match(r"^(select|with|explain)\b", lowered):
        raise HTTPException(status_code=400, detail="only read-only queries allowed")

    forbidden = [
        "insert",
        "update",
        "delete",
        "drop",
        "alter",
        "create",
        "truncate",
        "grant",
        "revoke",
        "vacuum",
    ]
    for keyword in forbidden:
        if re.search(rf"\b{keyword}\b", lowered):
            raise HTTPException(status_code=400, detail="query not permitted")

    if lowered.startswith("with") and "select" not in lowered:
        raise HTTPException(status_code=400, detail="query not permitted")

    if lowered.startswith(("select", "with")) and not re.search(
        r"\blimit\s+\d+\b", lowered
    ):
        normalized = f"{normalized} LIMIT 200"

    return normalized


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return value.hex()
    return value


async def _load_table(table_name: str) -> Table:
    async with engine.connect() as conn:
        def _get_table(sync_conn):
            inspector = inspect(sync_conn)
            tables = inspector.get_table_names()
            if table_name not in tables:
                return None
            metadata = MetaData()
            return Table(table_name, metadata, autoload_with=sync_conn)

        table = await conn.run_sync(_get_table)
    if table is None:
        raise HTTPException(status_code=404, detail="table not found")
    return table


def _get_primary_key_column(table: Table):
    pk_columns = list(table.primary_key.columns)
    if len(pk_columns) != 1:
        return None
    return pk_columns[0]


def _build_columns_metadata(table: Table) -> List[Dict[str, Any]]:
    columns = []
    for column in table.columns:
        columns.append(
            {
                "name": column.name,
                "type": str(column.type),
                "nullable": bool(column.nullable),
                "primary_key": bool(column.primary_key),
                "default": str(column.default.arg)
                if column.default is not None and column.default.arg is not None
                else None,
            }
        )
    return columns


def _coerce_pk_value(pk_value: str, column) -> Any:
    try:
        python_type = column.type.python_type
    except Exception:
        return pk_value

    try:
        if python_type is UUID:
            return UUID(pk_value)
        return python_type(pk_value)
    except Exception:
        return pk_value


class SqlQueryRequest(BaseModel):
    query: str


@router.post("/admin/sql")
async def run_sql_query(
    payload: SqlQueryRequest = Body(...),
    _: None = Depends(_verify_admin),
):
    query = _normalize_sql_query(payload.query)

    async with engine.connect() as conn:
        result = await conn.execute(text(query))
        rows = result.fetchall()
        columns = list(result.keys())

    return {
        "query": query,
        "columns": columns,
        "rows": [
            {key: _serialize_value(value) for key, value in row._mapping.items()}
            for row in rows
        ],
    }


@router.get("/admin/tables")
async def list_tables(_: None = Depends(_verify_admin)):
    async with engine.connect() as conn:
        def _get_tables(sync_conn):
            inspector = inspect(sync_conn)
            return inspector.get_table_names()

        tables = await conn.run_sync(_get_tables)

    return {"tables": tables}


@router.get("/admin/tables/{table_name}")
async def get_table_metadata(table_name: str, _: None = Depends(_verify_admin)):
    table = await _load_table(table_name)
    columns = _build_columns_metadata(table)
    primary_key = [col.name for col in table.primary_key.columns]
    return {"table": table_name, "columns": columns, "primary_key": primary_key}


@router.get("/admin/tables/{table_name}/rows")
async def get_table_rows(
    table_name: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _: None = Depends(_verify_admin),
):
    table = await _load_table(table_name)

    async with engine.connect() as conn:
        count_stmt = select(func.count()).select_from(table)
        total_result = await conn.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = select(table).limit(limit).offset(offset)
        result = await conn.execute(stmt)
        rows = [
            {key: _serialize_value(value) for key, value in row._mapping.items()}
            for row in result.fetchall()
        ]

    return {
        "table": table_name,
        "columns": _build_columns_metadata(table),
        "primary_key": [col.name for col in table.primary_key.columns],
        "rows": rows,
        "limit": limit,
        "offset": offset,
        "total": total,
    }


@router.post("/admin/tables/{table_name}/rows")
async def create_row(
    table_name: str,
    payload: Dict[str, Any] = Body(...),
    _: None = Depends(_verify_admin),
):
    table = await _load_table(table_name)
    allowed_fields = {column.name for column in table.columns}
    data = {key: value for key, value in payload.items() if key in allowed_fields}

    async with engine.begin() as conn:
        await conn.execute(insert(table).values(**data))

    return {"success": True}


@router.put("/admin/tables/{table_name}/rows/{pk_value}")
async def update_row(
    table_name: str,
    pk_value: str,
    payload: Dict[str, Any] = Body(...),
    _: None = Depends(_verify_admin),
):
    table = await _load_table(table_name)
    pk_column = _get_primary_key_column(table)
    if pk_column is None:
        raise HTTPException(
            status_code=400,
            detail="table has no single primary key column",
        )

    allowed_fields = {column.name for column in table.columns}
    data = {
        key: value
        for key, value in payload.items()
        if key in allowed_fields and key != pk_column.name
    }

    coerced_pk = _coerce_pk_value(pk_value, pk_column)

    async with engine.begin() as conn:
        result = await conn.execute(
            update(table).where(pk_column == coerced_pk).values(**data)
        )

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="row not found")

    return {"success": True}


@router.delete("/admin/tables/{table_name}/rows/{pk_value}")
async def delete_row(
    table_name: str,
    pk_value: str,
    _: None = Depends(_verify_admin),
):
    table = await _load_table(table_name)
    pk_column = _get_primary_key_column(table)
    if pk_column is None:
        raise HTTPException(
            status_code=400,
            detail="table has no single primary key column",
        )

    coerced_pk = _coerce_pk_value(pk_value, pk_column)

    async with engine.begin() as conn:
        result = await conn.execute(delete(table).where(pk_column == coerced_pk))

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="row not found")

    return {"success": True}
