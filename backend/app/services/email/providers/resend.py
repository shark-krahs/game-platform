from __future__ import annotations

import logging

import httpx

from backend.app.services.email.provider import EmailSendError

logger = logging.getLogger(__name__)


class ResendEmailProvider:
    def __init__(
        self,
        *,
        api_key: str,
        mail_from_name: str,
        mail_from_address: str,
        base_url: str = "https://api.resend.com",
        timeout_seconds: float = 10.0,
        max_retries: int = 1,
    ) -> None:
        if not api_key:
            raise EmailSendError("RESEND_API_KEY is not set")
        if not mail_from_address:
            raise EmailSendError("MAIL_FROM_ADDRESS is not set")
        self._api_key = api_key
        self._from = f"{mail_from_name} <{mail_from_address}>"
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds
        self._max_retries = max_retries

    async def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
        reply_to: str | None = None,
    ) -> None:
        payload: dict[str, object] = {
            "from": self._from,
            "to": [to],
            "subject": subject,
            "html": html_body,
        }
        if text_body:
            payload["text"] = text_body
        if reply_to:
            payload["replyTo"] = reply_to

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        attempt = 0
        while True:
            attempt += 1
            try:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    response = await client.post(
                        f"{self._base_url}/emails", json=payload, headers=headers
                    )
            except httpx.RequestError as exc:
                if attempt <= self._max_retries:
                    logger.warning("Resend request failed, retrying: %s", exc)
                    continue
                raise EmailSendError("Resend request failed") from exc

            if response.status_code < 400:
                return

            response_detail = _extract_response_detail(response)
            if response.status_code >= 500 and attempt <= self._max_retries:
                logger.warning(
                    "Resend 5xx response, retrying status=%s detail=%s",
                    response.status_code,
                    response_detail,
                )
                continue

            raise EmailSendError(
                f"Resend API error ({response.status_code})",
                status_code=response.status_code,
                response_body=response_detail,
            )


def _extract_response_detail(response: httpx.Response) -> str:
    try:
        data = response.json()
    except ValueError:
        return response.text

    if isinstance(data, dict):
        message = data.get("message") or data.get("error") or data.get("detail")
        if message:
            return str(message)
    return str(data)
