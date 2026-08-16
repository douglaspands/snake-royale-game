package com.snakeroyale.host

import android.graphics.Bitmap
import android.graphics.Color
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel

/**
 * ISO/IEC 18004 QR Code renderer backed by ZXing.
 *
 * The previous hand-rolled generator drew a symbol that looked correct but carried no
 * Reed-Solomon codewords, never wrote the format information area it reserved, and
 * omitted the dark module and quiet zone -- so no reader could decode it. See
 * REQ-AND-002 and the v1.6.0 design.md, Decision 1.
 */
object QRCodeHelper {

    /** Quiet zone in modules. The specification requires at least four. */
    private const val QUIET_ZONE_MODULES = 4

    /**
     * True when [url] points somewhere another device could actually reach.
     *
     * A QR encoding a loopback address sends the scanning phone to itself, producing a
     * connection error that looks like the host is broken. The dashboard suppresses the
     * symbol instead of presenting one that misattributes the problem.
     */
    fun isReachableByPeers(url: String): Boolean {
        val host = url.substringAfter("://", "").substringBefore(":").substringBefore("/")
        return host.isNotEmpty() &&
            host != "localhost" &&
            !host.startsWith("127.") &&
            host != "0.0.0.0" &&
            host != "::1"
    }

    fun generateQRCodeBitmap(content: String, size: Int = 512): Bitmap {
        val hints = mapOf(
            EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M,
            EncodeHintType.MARGIN to QUIET_ZONE_MODULES,
            EncodeHintType.CHARACTER_SET to "UTF-8",
        )
        val matrix = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size, hints)

        val width = matrix.width
        val height = matrix.height
        // One setPixels call instead of width*height setPixel calls: at 512x512 the
        // per-pixel path costs a quarter of a million JNI round trips on the main thread.
        val pixels = IntArray(width * height)
        for (y in 0 until height) {
            val rowOffset = y * width
            for (x in 0 until width) {
                pixels[rowOffset + x] = if (matrix[x, y]) Color.BLACK else Color.WHITE
            }
        }

        return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).apply {
            setPixels(pixels, 0, width, 0, 0, width, height)
        }
    }
}
