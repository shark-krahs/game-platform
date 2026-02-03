from __future__ import annotations

import asyncio
import logging
import smtplib
import socket
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Optional, Protocol

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class EmailSendError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        response_body: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class EmailProvider(Protocol):
    async def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
        reply_to: str | None = None,
    ) -> None:
        ...


@dataclass(slots=True)
class SMTPProvider:
    mail_from_name: str
    mail_from_address: str
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    smtp_use_tls: bool
    smtp_use_ssl: bool
    smtp_timeout_seconds: int
    smtp_debug: bool
    smtp_force_ipv4: bool

    async def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
        reply_to: str | None = None,
    ) -> None:
        await asyncio.to_thread(
            self._send_sync, to, subject, html_body, text_body, reply_to
        )

    def _send_sync(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: str | None,
        reply_to: str | None,
    ) -> None:
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = f"{self.mail_from_name} <{self.mail_from_address}>"
        message["To"] = to
        if reply_to:
            message["Reply-To"] = reply_to

        if text_body:
            message.set_content(text_body)
            message.add_alternative(html_body, subtype="html")
        else:
            message.set_content(html_body, subtype="html")

        smtp_class = smtplib.SMTP_SSL if self.smtp_use_ssl else smtplib.SMTP
        if self.smtp_debug:
            logger.info(
                "SMTP connect host=%s port=%s ssl=%s tls=%s",
                self.smtp_host,
                self.smtp_port,
                self.smtp_use_ssl,
                self.smtp_use_tls,
            )

        def _attempt_send(force_ipv4: bool) -> None:
            host = self.smtp_host
            port = self.smtp_port
            if force_ipv4:
                infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
                if infos:
                    host = infos[0][4][0]
                logger.info("SMTP force IPv4 resolved host=%s", host)
            with smtp_class(host, port, timeout=self.smtp_timeout_seconds) as server:
                if self.smtp_debug:
                    server.set_debuglevel(1)
                    logger.info("SMTP connected: %s", server.noop())
                    server.ehlo()
                if self.smtp_use_tls and not self.smtp_use_ssl:
                    if self.smtp_debug:
                        logger.info("SMTP starttls...")
                    server.starttls()
                    if self.smtp_debug:
                        server.ehlo()
                if self.smtp_user and self.smtp_password:
                    if self.smtp_debug:
                        logger.info("SMTP login user=%s", self.smtp_user)
                    server.login(self.smtp_user, self.smtp_password)
                server.send_message(message)
                if self.smtp_debug:
                    logger.info("SMTP message sent to %s", to)

        try:
            _attempt_send(self.smtp_force_ipv4)
        except Exception as exc:  # pragma: no cover - exercised via integration
            if not self.smtp_force_ipv4:
                logger.warning("SMTP send failed, retrying with IPv4: %s", exc)
                _attempt_send(True)
                return
            logger.exception("SMTP send failed: %s", exc)
            raise EmailSendError("SMTP send failed") from exc


def get_email_provider() -> EmailProvider:
    provider = settings.email_provider.lower()
    if provider == "smtp":
        from_address = settings.mail_from_address or settings.smtp_user
        if not from_address:
            raise EmailSendError("MAIL_FROM_ADDRESS or SMTP_USER must be set")
        return SMTPProvider(
            mail_from_name=settings.mail_from_name,
            mail_from_address=from_address,
            smtp_host=settings.smtp_host,
            smtp_port=settings.smtp_port,
            smtp_user=settings.smtp_user,
            smtp_password=settings.smtp_password,
            smtp_use_tls=settings.smtp_use_tls,
            smtp_use_ssl=settings.smtp_use_ssl,
            smtp_timeout_seconds=settings.smtp_timeout_seconds,
            smtp_debug=settings.smtp_debug,
            smtp_force_ipv4=settings.smtp_force_ipv4,
        )
    if provider == "resend":
        from backend.app.services.email.providers.resend import ResendEmailProvider

        return ResendEmailProvider(
            api_key=settings.resend_api_key,
            mail_from_name=settings.mail_from_name,
            mail_from_address=settings.mail_from_address,
        )
    raise EmailSendError(f"Unsupported EMAIL_PROVIDER: {provider}")
