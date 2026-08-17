package com.snakeroyale.host

import android.graphics.Bitmap
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.zxing.BinaryBitmap
import com.google.zxing.MultiFormatReader
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Round-trip regression test for the v1.6.0 bug where the hand-rolled QR encoder produced
 * symbols with no valid Reed-Solomon codewords -- they looked correct but no reader could
 * decode them. Requires a real Android Bitmap/graphics stack, so it lives here rather than
 * in the JVM unit test suite. See REQ-AND-002.
 */
@RunWith(AndroidJUnit4::class)
class QRCodeHelperInstrumentedTest {

    @Test
    fun encodedQrDecodesBackToTheOriginalUrl() {
        val url = "http://192.168.1.42:8000"
        val size = 256

        val bitmap = QRCodeHelper.generateQRCodeBitmap(url, size)

        assertEquals(size, bitmap.width)
        assertEquals(size, bitmap.height)
        assertEquals(url, decode(bitmap))
    }

    private fun decode(bitmap: Bitmap): String {
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        val source = RGBLuminanceSource(width, height, pixels)
        val binaryBitmap = BinaryBitmap(HybridBinarizer(source))
        return MultiFormatReader().decode(binaryBitmap).text
    }
}
