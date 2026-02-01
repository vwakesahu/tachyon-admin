import { auth } from "@/lib/auth";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { APP_NAME } from "@/lib/constants";

export async function GET() {
  try {
    const session = await auth();

    // Must be logged in with Google first
    if (!session?.user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Generate a new TOTP secret
    const secret = new OTPAuth.Secret({ size: 20 });

    // Create TOTP instance
    const totp = new OTPAuth.TOTP({
      issuer: APP_NAME,
      label: session.user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret,
    });

    // Generate the otpauth URI for QR code
    const otpauthUrl = totp.toString();

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#ffffff",
        light: "#000000",
      },
    });

    return Response.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      otpauthUrl,
    });
  } catch (error) {
    console.error("TOTP setup error:", error);
    return Response.json({ error: "Setup failed" }, { status: 500 });
  }
}
