import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from "antd";
import type { Rule } from "antd/es/form";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import { buildHttpApiBaseUrl } from "../utils/url";

type ColumnMeta = {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  default: string | null;
};

type TableRowsResponse = {
  table: string;
  columns: ColumnMeta[];
  primary_key: string[];
  rows: Record<string, any>[];
  limit: number;
  offset: number;
  total: number;
};

type SqlResult = {
  query: string;
  columns: string[];
  rows: Record<string, any>[];
};

type FormItemBuild = {
  input: React.ReactNode;
  rules: Rule[];
  valuePropName?: string;
};

const AdminPanel: React.FC = () => {
  const { t } = useTranslation();
  const [loginForm] = Form.useForm();
  const [rowForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<Record<string, any>[]>([]);
  const [columnsMeta, setColumnsMeta] = useState<ColumnMeta[]>([]);
  const [primaryKey, setPrimaryKey] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [rowModalOpen, setRowModalOpen] = useState(false);
  const [rowModalMode, setRowModalMode] = useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlResult, setSqlResult] = useState<SqlResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlLoading, setSqlLoading] = useState(false);

  const apiBaseUrl = useMemo(() => buildHttpApiBaseUrl(), []);
  const credentialsRef = useRef<{
    username: string;
    password: string;
  } | null>(null);

  const adminFetch = useCallback(
    async (
      endpoint: string,
      options: RequestInit = {},
      overrideCredentials?: { username: string; password: string } | null,
    ) => {
      const activeCredentials =
        overrideCredentials ?? credentialsRef.current ?? credentials;
      if (!activeCredentials) {
        throw new Error("missing credentials");
      }
      const token = window.btoa(
        `${activeCredentials.username}:${activeCredentials.password}`,
      );
      const response = await fetch(`${apiBaseUrl}/admin${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${token}`,
          ...(options.headers || {}),
        },
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errorMessage =
          data?.detail ||
          data?.message ||
          data?.error ||
          `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      return data;
    },
    [apiBaseUrl, credentials],
  );

  const loadRows = useCallback(
    async (tableName: string, page = pagination.current, pageSize = pagination.pageSize) => {
      setLoading(true);
      try {
        const offset = (page - 1) * pageSize;
        const data = (await adminFetch(
          `/tables/${encodeURIComponent(tableName)}/rows?limit=${pageSize}&offset=${offset}`,
        )) as TableRowsResponse;
        setTableRows(data.rows || []);
        setColumnsMeta(data.columns || []);
        setPrimaryKey(data.primary_key || []);
        setPagination({
          current: page,
          pageSize,
          total: data.total || 0,
        });
      } catch (error) {
        messageApi.error((error as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [adminFetch, messageApi, pagination.current, pagination.pageSize],
  );

  const loadTables = useCallback(
    async (overrideCredentials?: { username: string; password: string }) => {
      setLoading(true);
      setAuthError(null);
      try {
        const data = await adminFetch("/tables", {}, overrideCredentials);
        const tableList = Array.isArray(data?.tables) ? data.tables : [];
        setTables(tableList);
        if (tableList.length > 0) {
          const nextTable = selectedTable ?? tableList[0];
          setSelectedTable(nextTable);
          await loadRows(nextTable, 1, pagination.pageSize);
        } else {
          setSelectedTable(null);
          setTableRows([]);
          setColumnsMeta([]);
          setPrimaryKey([]);
        }
      } catch (error) {
        setAuthError((error as Error).message);
        setTables([]);
        setSelectedTable(null);
      } finally {
        setLoading(false);
      }
    },
    [adminFetch, loadRows, pagination.pageSize, selectedTable],
  );

  const handleLogin = async (values: { username: string; password?: string }) => {
    const normalized = {
      username: values.username,
      password: values.password ?? "",
    };
    credentialsRef.current = normalized;
    setCredentials(normalized);
    try {
      await loadTables(normalized);
      messageApi.success(t("admin.messages.accessGranted"));
    } catch {
      // loadTables handles error state
    }
  };

  const handleLogout = () => {
    credentialsRef.current = null;
    setCredentials(null);
    setAuthError(null);
    setTables([]);
    setSelectedTable(null);
    setTableRows([]);
    setColumnsMeta([]);
    setPrimaryKey([]);
    setPagination({
      current: 1,
      pageSize: 50,
      total: 0,
    });
    setSqlQuery("");
    setSqlResult(null);
    setSqlError(null);
    loginForm.resetFields();
  };

  const columnMetaMap = useMemo(() => {
    const map: Record<string, ColumnMeta> = {};
    columnsMeta.forEach((column) => {
      map[column.name] = column;
    });
    return map;
  }, [columnsMeta]);

  const getColumnType = (column?: ColumnMeta) =>
    (column?.type ?? "").toLowerCase();

  const isBooleanType = (type: string) => type.includes("bool");

  const isNumberType = (type: string) =>
    type.includes("int") ||
    type.includes("float") ||
    type.includes("double") ||
    type.includes("numeric") ||
    type.includes("decimal") ||
    type.includes("real");

  const isDateType = (type: string) =>
    type.includes("date") || type.includes("time");

  const isJsonType = (type: string) => type.includes("json");

  const isTextAreaType = (type: string) =>
    type.includes("text") || isJsonType(type);

  const parseValue = (columnName: string, value: any) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const column = columnMetaMap[columnName];
    const rawType = getColumnType(column);

    if (typeof value === "boolean" || typeof value === "number") {
      return value;
    }

    if (isJsonType(rawType) && typeof value !== "string") {
      return value;
    }

    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();

    if (trimmed === "") {
      return column?.nullable ? null : "";
    }

    if (isBooleanType(rawType)) {
      if (trimmed.toLowerCase() === "true") {
        return true;
      }
      if (trimmed.toLowerCase() === "false") {
        return false;
      }
      return value;
    }

    if (isNumberType(rawType)) {
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? value : parsed;
    }

    if (isJsonType(rawType)) {
      try {
        return JSON.parse(trimmed);
      } catch {
        throw new Error(
          t("admin.validation.invalidJsonField", { field: columnName }),
        );
      }
    }

    if (isDateType(rawType)) {
      if (rawType.includes("date") && !rawType.includes("time")) {
        const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
          return trimmed;
        }
      }
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    return value;
  };

  const openCreateModal = () => {
    setRowModalMode("create");
    setEditingRow(null);
    rowForm.resetFields();
    setRowModalOpen(true);
  };

  const openEditModal = (row: Record<string, any>) => {
    setRowModalMode("edit");
    setEditingRow(row);
    const formValues: Record<string, any> = {};
    columnsMeta.forEach((column) => {
      const value = row[column.name];
      const rawType = getColumnType(column);
      if (value === null || value === undefined) {
        formValues[column.name] = undefined;
        return;
      }
      if (isBooleanType(rawType)) {
        formValues[column.name] = Boolean(value);
        return;
      }
      if (isNumberType(rawType)) {
        const numeric = Number(value);
        formValues[column.name] = Number.isNaN(numeric) ? undefined : numeric;
        return;
      }
      if (isDateType(rawType)) {
        formValues[column.name] = String(value);
        return;
      }
      if (isJsonType(rawType)) {
        if (typeof value === "string") {
          formValues[column.name] = value;
        } else {
          formValues[column.name] = JSON.stringify(value, null, 2);
        }
        return;
      }
      formValues[column.name] = String(value);
    });
    rowForm.setFieldsValue(formValues);
    setRowModalOpen(true);
  };

  const buildFormItem = (column: ColumnMeta): FormItemBuild => {
    const rawType = getColumnType(column);
    const isPrimaryKey = primaryKey.includes(column.name);
    const isReadonlyKey = rowModalMode === "edit" && isPrimaryKey;
    const rules: Rule[] = [];
    const isRequired = !column.nullable && !isPrimaryKey;
    if (isRequired && !isBooleanType(rawType)) {
      rules.push({ required: true, message: t("admin.validation.required") });
    }
    if (isJsonType(rawType)) {
      rules.push({
        validator: (_: unknown, value: string) => {
          if (value === undefined || value === null || value === "") {
            return Promise.resolve();
          }
          try {
            JSON.parse(value);
            return Promise.resolve();
          } catch {
            return Promise.reject(new Error(t("admin.validation.invalidJson")));
          }
        },
      });
    }

    if (isBooleanType(rawType)) {
      if (isRequired) {
        rules.push({
          validator: (_: unknown, value: boolean | undefined) =>
            value === undefined
              ? Promise.reject(new Error(t("admin.validation.required")))
              : Promise.resolve(),
        });
      }
      return {
        valuePropName: "checked",
        rules,
        input: <Switch disabled={isReadonlyKey} />,
      };
    }

    if (isNumberType(rawType)) {
      return {
        rules,
        input: (
          <InputNumber
            disabled={isReadonlyKey}
            style={{ width: "100%" }}
            placeholder={
              column.default
                ? t("admin.fields.default", { value: column.default })
                : ""
            }
          />
        ),
      };
    }

    if (isDateType(rawType)) {
      const showTime = rawType.includes("time");
      return {
        rules,
        input: (
          <Input
            disabled={isReadonlyKey}
            type={showTime ? "datetime-local" : "date"}
            placeholder={
              column.default
                ? t("admin.fields.default", { value: column.default })
                : ""
            }
          />
        ),
      };
    }

    if (isTextAreaType(rawType)) {
      return {
        rules,
        input: (
          <Input.TextArea
            disabled={isReadonlyKey}
            autoSize={{ minRows: 2, maxRows: 6 }}
            placeholder={
              column.default
                ? t("admin.fields.default", { value: column.default })
                : ""
            }
          />
        ),
      };
    }

    return {
      rules,
      input: (
        <Input
          disabled={isReadonlyKey}
          placeholder={
            column.default ? t("admin.fields.default", { value: column.default }) : ""
          }
        />
      ),
    };
  };

  const handleRowSave = async () => {
    if (!selectedTable) {
      return;
    }
    try {
      const values = await rowForm.validateFields();
      const parsed: Record<string, any> = {};
      Object.entries(values).forEach(([key, value]) => {
        const parsedValue = parseValue(key, value);
        if (parsedValue !== undefined) {
          parsed[key] = parsedValue;
        }
      });

      if (rowModalMode === "create") {
        await adminFetch(
          `/tables/${encodeURIComponent(selectedTable)}/rows`,
          {
            method: "POST",
            body: JSON.stringify(parsed),
          },
        );
        messageApi.success(t("admin.messages.rowCreated"));
      } else if (rowModalMode === "edit" && editingRow) {
        const pkColumn = primaryKey[0];
        const pkValue = editingRow[pkColumn!];
        await adminFetch(
          `/tables/${encodeURIComponent(selectedTable)}/rows/${encodeURIComponent(
            String(pkValue),
          )}`,
          {
            method: "PUT",
            body: JSON.stringify(parsed),
          },
        );
        messageApi.success(t("admin.messages.rowUpdated"));
      }

      setRowModalOpen(false);
      await loadRows(selectedTable, pagination.current, pagination.pageSize);
    } catch (error) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      }
    }
  };

  const handleRowDelete = async (row: Record<string, any>) => {
    if (!selectedTable) {
      return;
    }
    try {
      const pkColumn = primaryKey[0];
      const pkValue = row[pkColumn!];
      await adminFetch(
        `/tables/${encodeURIComponent(selectedTable)}/rows/${encodeURIComponent(
          String(pkValue),
        )}`,
        {
          method: "DELETE",
        },
      );
      messageApi.success(t("admin.messages.rowDeleted"));
      await loadRows(selectedTable, pagination.current, pagination.pageSize);
    } catch (error) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      }
    }
  };

  const handleSqlRun = async () => {
    if (!sqlQuery.trim()) {
      messageApi.error(t("admin.sql.enterQuery"));
      return;
    }
    setSqlLoading(true);
    setSqlError(null);
    try {
      const data = (await adminFetch("/sql", {
        method: "POST",
        body: JSON.stringify({ query: sqlQuery }),
      })) as SqlResult;
      setSqlResult(data);
    } catch (error) {
      const message = (error as Error).message;
      setSqlError(message);
      setSqlResult(null);
    } finally {
      setSqlLoading(false);
    }
  };

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    setPagination((prev) => ({ ...prev, current: 1 }));
    loadRows(tableName, 1, pagination.pageSize);
  };

  const columns: ColumnsType<Record<string, any>> = useMemo(() => {
    const baseColumns: ColumnsType<Record<string, any>> = columnsMeta.map(
      (column) => ({
        title: column.name,
        dataIndex: column.name,
        key: column.name,
        render: (value: any) => {
          if (value === null || value === undefined) {
            return (
              <Typography.Text type="secondary">{t("admin.null")}</Typography.Text>
            );
          }
          return String(value);
        },
      }),
    );

    if (primaryKey.length === 1) {
      baseColumns.push({
        title: t("admin.actions.title"),
        key: "actions",
        render: (_: unknown, row: Record<string, any>) => (
          <Space>
            <Button size="small" onClick={() => openEditModal(row)}>
              {t("admin.actions.edit")}
            </Button>
            <Popconfirm
              title={t("admin.actions.deleteConfirm")}
              onConfirm={() => handleRowDelete(row)}
            >
              <Button size="small" danger>
                {t("admin.actions.delete")}
              </Button>
            </Popconfirm>
          </Space>
        ),
      });
    }

    return baseColumns;
  }, [columnsMeta, primaryKey, t]);

  const sqlColumns: ColumnsType<Record<string, any>> = useMemo(() => {
    if (!sqlResult) {
      return [];
    }
    return sqlResult.columns.map((column) => ({
      title: column,
      dataIndex: column,
      key: column,
      render: (value: any) => {
        if (value === null || value === undefined) {
          return (
            <Typography.Text type="secondary">{t("admin.null")}</Typography.Text>
          );
        }
        return String(value);
      },
    }));
  }, [sqlResult, t]);

  const isAuthenticated = credentials !== null && !authError;

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      {contextHolder}
      <Typography.Title level={2}>{t("admin.title")}</Typography.Title>
      {!isAuthenticated ? (
        <div style={{ maxWidth: 420 }}>
          <Typography.Paragraph type="secondary">
            {t("admin.login.subtitle")}
          </Typography.Paragraph>
          {authError && <Alert type="error" message={authError} showIcon />}
          <Form form={loginForm} layout="vertical" onFinish={handleLogin}>
            <Form.Item
              label={t("admin.login.username")}
              name="username"
              rules={[
                { required: true, message: t("admin.login.enterUsername") },
              ]}
            >
              <Input autoComplete="username" />
            </Form.Item>
            <Form.Item label={t("admin.login.password")} name="password">
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t("admin.login.signIn")}
            </Button>
          </Form>
        </div>
      ) : (
        <>
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              style={{ minWidth: 240 }}
              placeholder={t("admin.tables.select")}
              value={selectedTable ?? undefined}
              onChange={handleTableChange}
              options={tables.map((table) => ({ value: table, label: table }))}
            />
            <Button onClick={() => loadTables()} loading={loading}>
              {t("admin.tables.refreshTables")}
            </Button>
            <Button
              onClick={() =>
                selectedTable &&
                loadRows(selectedTable, pagination.current, pagination.pageSize)
              }
              disabled={!selectedTable}
            >
              {t("admin.tables.refreshRows")}
            </Button>
            <Button
              type="primary"
              onClick={openCreateModal}
              disabled={!selectedTable}
            >
              {t("admin.tables.createRow")}
            </Button>
            <Button onClick={handleLogout}>{t("admin.tables.logOut")}</Button>
          </Space>

          {primaryKey.length !== 1 && selectedTable && (
            <Alert
              type="warning"
              showIcon
              message={t("admin.tables.singlePkWarning")}
              style={{ marginBottom: 16 }}
            />
          )}

          <Table
            rowKey={(row) =>
              primaryKey.length === 1 && primaryKey[0]
                ? String(row[primaryKey[0]])
                : JSON.stringify(row)
            }
            loading={loading}
            columns={columns}
            dataSource={tableRows}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              pageSizeOptions: ["25", "50", "100", "200"],
              onChange: (page, pageSize) => {
                if (selectedTable) {
                  loadRows(selectedTable, page, pageSize);
                }
              },
            }}
            scroll={{ x: true }}
          />

          <Divider titlePlacement="start">{t("admin.sql.title")}</Divider>
          <Typography.Paragraph type="secondary">
            {t("admin.sql.subtitle")}
          </Typography.Paragraph>
          <Input.TextArea
            value={sqlQuery}
            onChange={(event) => setSqlQuery(event.target.value)}
            autoSize={{ minRows: 4, maxRows: 8 }}
            placeholder={t("admin.sql.placeholder")}
            style={{ marginBottom: 12 }}
          />
          <Space style={{ marginBottom: 12 }}>
            <Button type="primary" onClick={handleSqlRun} loading={sqlLoading}>
              {t("admin.sql.run")}
            </Button>
            <Button
              onClick={() => {
                setSqlQuery("");
                setSqlResult(null);
                setSqlError(null);
              }}
            >
              {t("admin.sql.clear")}
            </Button>
          </Space>
          {sqlError && <Alert type="error" showIcon message={sqlError} />}
          {sqlResult && (
            <>
              <Typography.Paragraph type="secondary">
                {t("admin.sql.executed")}: {sqlResult.query}
              </Typography.Paragraph>
              <Table
                rowKey={(_, index) => String(index)}
                columns={sqlColumns}
                dataSource={sqlResult.rows}
                pagination={false}
                scroll={{ x: true }}
              />
            </>
          )}
        </>
      )}

      <Modal
        open={rowModalOpen}
        onCancel={() => setRowModalOpen(false)}
        onOk={handleRowSave}
        title={
          rowModalMode === "create"
            ? t("admin.modal.createTitle")
            : t("admin.modal.editTitle")
        }
        okText={
          rowModalMode === "create"
            ? t("admin.modal.createOk")
            : t("admin.modal.saveOk")
        }
      >
        <Form form={rowForm} layout="vertical">
          {columnsMeta.map((column) => {
            const { input, rules, valuePropName } = buildFormItem(column);
            return (
              <Form.Item
                key={column.name}
                label={`${column.name} (${column.type})`}
                name={column.name}
                rules={rules}
                valuePropName={valuePropName}
              >
                {input}
              </Form.Item>
            );
          })}
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPanel;
