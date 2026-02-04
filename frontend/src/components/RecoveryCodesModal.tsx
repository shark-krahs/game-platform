import React, { useEffect, useMemo, useState } from "react";
import { Button, Modal, Typography } from "antd";
import { useTranslation } from "react-i18next";

interface RecoveryCodesModalProps {
  open: boolean;
  codes: string[];
  onAcknowledge: () => Promise<void> | void;
}

const RecoveryCodesModal: React.FC<RecoveryCodesModalProps> = ({
  open,
  codes,
  onAcknowledge,
}) => {
  const { t } = useTranslation(["register", "profile"]);
  const [copyNotice, setCopyNotice] = useState<string>("");
  const [confirmCountdown, setConfirmCountdown] = useState<number>(7);
  const [confirmReady, setConfirmReady] = useState<boolean>(false);

  const codesText = useMemo(() => codes.join("\n"), [codes]);

  useEffect(() => {
    if (!open) return;
    setCopyNotice("");
    setConfirmReady(false);
    setConfirmCountdown(7);
    const interval = setInterval(() => {
      setConfirmCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    const timer = setTimeout(() => {
      setConfirmReady(true);
      setConfirmCountdown(0);
    }, 7000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codesText);
      setCopyNotice(t("codesCopied" as any));
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([codesText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "access-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const content = codes.join("<br/>");
    const w = window.open("", "_blank", "width=600,height=600");
    if (!w) return;
    w.document.write(`<h1>${t("recoveryTitle" as any)}</h1>`);
    w.document.write(`<p>${t("recoveryWarning" as any)}</p>`);
    w.document.write(`<pre style=\"font-size:16px;\">${content}</pre>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <Modal
      open={open}
      closable={false}
      maskClosable={false}
      footer={null}
      title={t("recoveryIntroTitle" as any)}
    >
      <p>{t("recoveryIntro" as any)}</p>
      <pre style={{ whiteSpace: "pre-wrap" }}>{codesText}</pre>
      {copyNotice && <Typography.Text type="success">{copyNotice}</Typography.Text>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button onClick={handleCopy}>{t("copyCodes" as any)}</Button>
        <Button onClick={handleDownload}>{t("downloadCodes" as any)}</Button>
        <Button onClick={handlePrint}>{t("printCodes" as any)}</Button>
        <Button type="primary" onClick={onAcknowledge} disabled={!confirmReady}>
          {confirmReady
            ? t("codesCopied" as any)
            : `${t("codesCopied" as any)} (${confirmCountdown}s)`}
        </Button>
      </div>
    </Modal>
  );
};

export default RecoveryCodesModal;
