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


EMAIL_TEMPLATES = {
    "en": {
        "verification_subject": "Confirm your email",
        "verification_greeting": "Hello {username},",
        "verification_intro": "Thanks for registering. Please confirm your email by clicking the link below:",
        "verification_action": "Confirm email",
        "verification_ignore": "If you didn't sign up, ignore this email.",
        "reset_subject": "Reset your password",
        "reset_greeting": "Hello {username},",
        "reset_intro": "You requested a password reset. Click the link below to set a new password:",
        "reset_action": "Reset password",
        "reset_ignore": "If you didn't request this, ignore this email.",
        "change_subject": "Confirm your new email",
        "change_greeting": "Hello {username},",
        "change_intro": "Please confirm your new email address by clicking the link below:",
        "change_action": "Confirm new email",
        "change_ignore": "If you didn't request this, ignore this email.",
    },
    "ru": {
        "verification_subject": "Подтвердите почту",
        "verification_greeting": "Здравствуйте, {username},",
        "verification_intro": "Спасибо за регистрацию. Подтвердите почту, нажав на ссылку ниже:",
        "verification_action": "Подтвердить почту",
        "verification_ignore": "Если вы не регистрировались, просто проигнорируйте это письмо.",
        "reset_subject": "Сброс пароля",
        "reset_greeting": "Здравствуйте, {username},",
        "reset_intro": "Вы запросили сброс пароля. Нажмите на ссылку ниже, чтобы задать новый пароль:",
        "reset_action": "Сбросить пароль",
        "reset_ignore": "Если вы не запрашивали сброс, проигнорируйте это письмо.",
        "change_subject": "Подтвердите новый адрес почты",
        "change_greeting": "Здравствуйте, {username},",
        "change_intro": "Подтвердите новый адрес почты, нажав на ссылку ниже:",
        "change_action": "Подтвердить новую почту",
        "change_ignore": "Если вы не запрашивали смену почты, проигнорируйте это письмо.",
    },
    "be": {
        "verification_subject": "Пацвердзіце пошту",
        "verification_greeting": "Вітаем, {username},",
        "verification_intro": "Дзякуй за рэгістрацыю. Пацвердзіце пошту, націснуўшы спасылку ніжэй:",
        "verification_action": "Пацвердзіць пошту",
        "verification_ignore": "Калі вы не рэгістраваліся, проста праігнаруйце гэты ліст.",
        "reset_subject": "Скід пароля",
        "reset_greeting": "Вітаем, {username},",
        "reset_intro": "Вы запыталі скід пароля. Націсніце спасылку ніжэй, каб задаць новы пароль:",
        "reset_action": "Скінуць пароль",
        "reset_ignore": "Калі вы не запытвалі скід, праігнаруйце гэты ліст.",
        "change_subject": "Пацвердзіце новы адрас пошты",
        "change_greeting": "Вітаем, {username},",
        "change_intro": "Пацвердзіце новы адрас пошты, націснуўшы спасылку ніжэй:",
        "change_action": "Пацвердзіць новую пошту",
        "change_ignore": "Калі вы не запытвалі змену пошты, праігнаруйце гэты ліст.",
    },
    "kk": {
        "verification_subject": "Поштаны растаңыз",
        "verification_greeting": "Сәлем, {username},",
        "verification_intro": "Тіркелгеніңізге рахмет. Төмендегі сілтемені басып поштаны растаңыз:",
        "verification_action": "Поштаны растау",
        "verification_ignore": "Егер сіз тіркелмесеңіз, бұл хатты елемеңіз.",
        "reset_subject": "Құпиясөзді қалпына келтіру",
        "reset_greeting": "Сәлем, {username},",
        "reset_intro": "Сіз құпиясөзді қалпына келтіруді сұрадыңыз. Жаңа құпиясөз орнату үшін төмендегі сілтемені басыңыз:",
        "reset_action": "Құпиясөзді қалпына келтіру",
        "reset_ignore": "Егер сұрау жасамаған болсаңыз, бұл хатты елемеңіз.",
        "change_subject": "Жаңа поштаңызды растаңыз",
        "change_greeting": "Сәлем, {username},",
        "change_intro": "Жаңа пошта мекенжайын растау үшін төмендегі сілтемені басыңыз:",
        "change_action": "Жаңа поштаны растау",
        "change_ignore": "Егер сіз поштаны өзгертуді сұрамаған болсаңыз, бұл хатты елемеңіз.",
    },
    "uk": {
        "verification_subject": "Підтвердіть пошту",
        "verification_greeting": "Вітаємо, {username},",
        "verification_intro": "Дякуємо за реєстрацію. Підтвердіть пошту, натиснувши посилання нижче:",
        "verification_action": "Підтвердити пошту",
        "verification_ignore": "Якщо ви не реєструвалися, проігноруйте цей лист.",
        "reset_subject": "Скидання пароля",
        "reset_greeting": "Вітаємо, {username},",
        "reset_intro": "Ви запросили скидання пароля. Натисніть посилання нижче, щоб встановити новий пароль:",
        "reset_action": "Скинути пароль",
        "reset_ignore": "Якщо ви не запитували скидання, проігноруйте цей лист.",
        "change_subject": "Підтвердіть нову адресу пошти",
        "change_greeting": "Вітаємо, {username},",
        "change_intro": "Підтвердіть нову адресу пошти, натиснувши посилання нижче:",
        "change_action": "Підтвердити нову пошту",
        "change_ignore": "Якщо ви не запитували зміну пошти, проігноруйте цей лист.",
    },
}


def _normalize_locale(locale: str | None) -> str:
    if not locale:
        return "en"
    normalized = locale.replace('_', '-').lower()
    base = normalized.split('-')[0]
    return base if base in EMAIL_TEMPLATES else "en"


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


def build_verification_email(username: str, confirm_link: str, locale: str | None = None) -> EmailPayload:
    template = EMAIL_TEMPLATES[_normalize_locale(locale)]
    return EmailPayload(
        to_address="",
        subject=template["verification_subject"],
        html_body=(
            f"<p>{template['verification_greeting'].format(username=username)}</p>"
            f"<p>{template['verification_intro']}</p>"
            f"<p><a href=\"{confirm_link}\">{template['verification_action']}</a></p>"
            f"<p>{template['verification_ignore']}</p>"
        ),
    )


def build_password_reset_email(username: str, reset_link: str, locale: str | None = None) -> EmailPayload:
    template = EMAIL_TEMPLATES[_normalize_locale(locale)]
    return EmailPayload(
        to_address="",
        subject=template["reset_subject"],
        html_body=(
            f"<p>{template['reset_greeting'].format(username=username)}</p>"
            f"<p>{template['reset_intro']}</p>"
            f"<p><a href=\"{reset_link}\">{template['reset_action']}</a></p>"
            f"<p>{template['reset_ignore']}</p>"
        ),
    )


def build_email_change_email(username: str, confirm_link: str, locale: str | None = None) -> EmailPayload:
    template = EMAIL_TEMPLATES[_normalize_locale(locale)]
    return EmailPayload(
        to_address="",
        subject=template["change_subject"],
        html_body=(
            f"<p>{template['change_greeting'].format(username=username)}</p>"
            f"<p>{template['change_intro']}</p>"
            f"<p><a href=\"{confirm_link}\">{template['change_action']}</a></p>"
            f"<p>{template['change_ignore']}</p>"
        ),
    )