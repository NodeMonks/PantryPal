import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Barcode } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";

const DECODE_INTERVAL_MS = 300;

const getCameraConstraints = () => ({
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
});

export default function BarcodeScanner() {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<
    "idle" | "scanning" | "denied" | "no-camera" | "error" | "success"
  >("idle");
  const [lastCode, setLastCode] = useState<string>("");
  const [manualCode, setManualCode] = useState<string>("");
  const { toast } = useToast();

  const stopScanner = useCallback(() => {
    readerRef.current?.reset();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleError = useCallback(
    (err: unknown) => {
      console.error("Barcode scanner error", err);
      if (err && typeof err === "object" && "name" in err) {
        const name = (err as Error & { name: string }).name;
        if (name === "NotAllowedError") {
          setStatus("denied");
          toast({
            title: "Camera permission denied",
            description: "Use manual entry or enable camera access to scan.",
            variant: "destructive",
          });
          return;
        }
        if (name === "NotFoundError") {
          setStatus("no-camera");
          return;
        }
      }
      setStatus("error");
    },
    [toast],
  );

  const startScanner = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("no-camera");
      return;
    }

    try {
      setStatus("scanning");
      const constraints = getCameraConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const reader = new BrowserMultiFormatReader(
        undefined,
        DECODE_INTERVAL_MS,
      );
      readerRef.current = reader;

      await reader.decodeFromConstraints(
        constraints,
        videoRef.current!,
        (res, err) => {
          if (res) {
            const text = res.getText();
            setLastCode(text);
            setStatus("success");
            toast({ title: "Scanned", description: text });
            stopScanner();
          }
          if (err && status === "scanning") {
            // ZXing emits decode errors frequently; ignore unless critical.
            return;
          }
        },
      );
    } catch (err) {
      handleError(err);
      stopScanner();
    }
  }, [handleError, stopScanner, toast, status]);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, [startScanner, stopScanner]);

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    setLastCode(manualCode.trim());
    setStatus("success");
    toast({ title: "Manual code captured", description: manualCode.trim() });
  };

  const showVideo =
    status === "scanning" || status === "success" || status === "idle";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Barcode className="h-6 w-6" />
            <div>
              <CardTitle>{t("barcode.title")}</CardTitle>
              <CardDescription>{t("barcode.physicalTip")}</CardDescription>
            </div>
          </div>
          <Badge variant={status === "success" ? "default" : "secondary"}>
            {status === "scanning"
              ? t("barcode.scanning")
              : status === "success"
                ? t("common.success", "Captured")
                : status === "denied"
                  ? t("barcode.denied").substring(0, 20)
                  : status === "no-camera"
                    ? t("barcode.noCamera").substring(0, 15)
                    : status === "error"
                      ? t("barcode.error").substring(0, 10)
                      : t("common.ready", "Idle")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {showVideo && (
            <div className="relative overflow-hidden rounded-lg border bg-black/80">
              <video
                ref={videoRef}
                className="h-64 w-full object-cover"
                playsInline
                muted
                autoPlay
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-32 w-48 rounded-md border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.5)]" />
              </div>
            </div>
          )}

          {(status === "denied" || status === "no-camera") && (
            <Alert>
              <AlertDescription>
                {status === "denied"
                  ? t("barcode.denied")
                  : t("barcode.noCamera")}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="manual-barcode">{t("barcode.manualEntry")}</Label>
            <div className="flex gap-2">
              <Input
                id="manual-barcode"
                placeholder={t("barcode.manualPlaceholder")}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualSubmit();
                }}
              />
              <Button onClick={handleManualSubmit}>
                {t("barcode.submit")}
              </Button>
            </div>
          </div>

          {lastCode && (
            <Alert>
              <AlertDescription>
                {t("barcode.lastScanned")}: <strong>{lastCode}</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={startScanner}
              disabled={status === "scanning"}
            >
              {t("barcode.startScanner")}
            </Button>
            <Button variant="secondary" onClick={stopScanner}>
              {t("newBill.stopScanner")}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              Tips: good lighting, steady hand, center the code inside the box.
            </p>
            <p>
              Supports common symbologies (EAN-13, UPC-A, Code-128, Code-39,
              QR).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
