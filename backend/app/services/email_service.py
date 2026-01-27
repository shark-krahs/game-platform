from __future__ import annotations

import secrets
import smtplib
import logging
import socket
from dataclasses import dataclass
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class EmailPayload:
    to_address: str
    subject: str
    html_body: str


def generate_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)


def build_confirm_link(token: str) -> str:
    return f"{settings.frontend_base_url}/confirm-email?token={token}"


def build_password_reset_link(token: str) -> str:
    return f"{settings.frontend_base_url}/reset-password?token={token}"


def build_email_change_link(token: str) -> str:
    return f"{settings.frontend_base_url}/confirm-email-change?token={token}"


def mask_email(email: str) -> str:
    if not email or "@" not in email:
        return ""
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = f"{local[0]}*" if local else "*"
    else:
        masked_local = f"{local[0]}{'*' * (len(local) - 2)}{local[-1]}"
    return f"{masked_local}@{domain}"


def send_email(payload: EmailPayload) -> None:
    message = EmailMessage()
    message["Subject"] = payload.subject
    message["From"] = f"{settings.mail_from_name} <{settings.mail_from_address or settings.smtp_user}>"
    message["To"] = payload.to_address
    message.set_content(payload.html_body, subtype="html")

    smtp_class = smtplib.SMTP_SSL if settings.smtp_use_ssl else smtplib.SMTP
    if settings.smtp_debug:
        logger.info(
            "SMTP connect host=%s port=%s ssl=%s tls=%s",
            settings.smtp_host,
            settings.smtp_port,
            settings.smtp_use_ssl,
            settings.smtp_use_tls,
        )
    def _attempt_send(force_ipv4: bool) -> None:
        host = settings.smtp_host
        port = settings.smtp_port
        if force_ipv4:
            infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
            if infos:
                host = infos[0][4][0]
            logger.info("SMTP force IPv4 resolved host=%s", host)
        with smtp_class(host, port, timeout=settings.smtp_timeout_seconds) as server:
            if settings.smtp_debug:
                server.set_debuglevel(1)
                logger.info("SMTP connected: %s", server.noop())
                server.ehlo()
            if settings.smtp_use_tls and not settings.smtp_use_ssl:
                if settings.smtp_debug:
                    logger.info("SMTP starttls...")
                server.starttls()
                if settings.smtp_debug:
                    server.ehlo()
            if settings.smtp_user and settings.smtp_password:
                if settings.smtp_debug:
                    logger.info("SMTP login user=%s", settings.smtp_user)
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
            if settings.smtp_debug:
                logger.info("SMTP message sent to %s", payload.to_address)

    try:
        _attempt_send(settings.smtp_force_ipv4)
    except Exception as exc:
        if not settings.smtp_force_ipv4:
            logger.warning("SMTP send failed, retrying with IPv4: %s", exc)
            _attempt_send(True)
            return
        logger.exception("SMTP send failed: %s", exc)
        raise


def build_verification_email(username: str, confirm_link: str) -> EmailPayload:
    return EmailPayload(
        to_address="",
        subject="Confirm your email",
        html_body=(
            f"<p>Hello {username},</p>"
            "<p>Thanks for registering. Please confirm your email by clicking the link below:</p>"
            f"<p><a href=\"{confirm_link}\">Confirm email</a></p>"
            "<p>If you didn't sign up, ignore this email.</p>"
        ),
    )


def build_password_reset_email(username: str, reset_link: str) -> EmailPayload:
    return EmailPayload(
        to_address="",
        subject="Reset your password",
        html_body=(
            f"<p>Hello {username},</p>"
            "<p>You requested a password reset. Click the link below to set a new password:</p>"
            f"<p><a href=\"{reset_link}\">Reset password</a></p>"
            "<p>If you didn't request this, ignore this email.</p>"
        ),
    )


def build_email_change_email(username: str, confirm_link: str) -> EmailPayload:
    return EmailPayload(
        to_address="",
        subject="Confirm your new email",
        html_body=(
            f"<p>Hello {username},</p>"
            "<p>Please confirm your new email address by clicking the link below:</p>"
            f"<p><a href=\"{confirm_link}\">Confirm new email</a></p>"
            "<p>If you didn't request this, ignore this email.</p>"
        ),
    )