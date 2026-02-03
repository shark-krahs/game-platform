import json

import pytest
import respx

from backend.app.services.email.provider import EmailSendError
from backend.app.services.email.providers.resend import ResendEmailProvider


@pytest.mark.asyncio
async def test_resend_payload_building() -> None:
    provider = ResendEmailProvider(
        api_key="test-key",
        mail_from_name="Game Platform",
        mail_from_address="from@example.com",
    )

    with respx.mock(assert_all_called=True) as respx_mock:
        route = respx_mock.post("https://api.resend.com/emails").respond(
            200, json={"id": "email_123"}
        )

        await provider.send_email(
            to="to@example.com",
            subject="Hello",
            html_body="<p>Hi</p>",
            text_body="Hi",
            reply_to="support@example.com",
        )

        request = route.calls[0].request
        payload = json.loads(request.content.decode("utf-8"))

        assert payload["from"] == "Game Platform <from@example.com>"
        assert payload["to"] == ["to@example.com"]
        assert payload["subject"] == "Hello"
        assert payload["html"] == "<p>Hi</p>"
        assert payload["text"] == "Hi"
        assert payload["replyTo"] == "support@example.com"
        assert request.headers["Authorization"] == "Bearer test-key"


@pytest.mark.asyncio
async def test_resend_error_passthrough() -> None:
    provider = ResendEmailProvider(
        api_key="test-key",
        mail_from_name="Game Platform",
        mail_from_address="from@example.com",
    )

    with respx.mock(assert_all_called=True) as respx_mock:
        respx_mock.post("https://api.resend.com/emails").respond(
            400, json={"message": "invalid address"}
        )

        with pytest.raises(EmailSendError) as exc:
            await provider.send_email(
                to="bad@example.com",
                subject="Oops",
                html_body="<p>Hi</p>",
            )

        assert exc.value.status_code == 400
        assert "invalid address" in (exc.value.response_body or "")
