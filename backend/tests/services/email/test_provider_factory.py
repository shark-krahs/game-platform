from backend.app.core import config
from backend.app.services.email.provider import get_email_provider
from backend.app.services.email.providers.resend import ResendEmailProvider


def test_get_email_provider_resend(monkeypatch) -> None:
    monkeypatch.setattr(config.settings, "email_provider", "resend")
    monkeypatch.setattr(config.settings, "resend_api_key", "test-key")
    monkeypatch.setattr(config.settings, "mail_from_name", "Game Platform")
    monkeypatch.setattr(config.settings, "mail_from_address", "from@example.com")

    provider = get_email_provider()

    assert isinstance(provider, ResendEmailProvider)
