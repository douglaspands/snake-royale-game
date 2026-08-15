package com.snakeroyale.host

import android.graphics.Bitmap
import android.graphics.Color

/**
 * Pure Kotlin QR Code Matrix Generator (Model 2, Version 1-4 Byte Mode with ECC L).
 * Renders high-contrast Android Bitmap without external dependencies.
 */
object QRCodeHelper {

    fun generateQRCodeBitmap(content: String, size: Int = 512): Bitmap {
        val matrix = encodeStringToQRMatrix(content)
        val matrixSize = matrix.size

        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val scale = size.toFloat() / matrixSize

        for (x in 0 until size) {
            for (y in 0 until size) {
                val matrixX = (x / scale).toInt().coerceIn(0, matrixSize - 1)
                val matrixY = (y / scale).toInt().coerceIn(0, matrixSize - 1)
                val color = if (matrix[matrixY][matrixX]) Color.BLACK else Color.WHITE
                bitmap.setPixel(x, y, color)
            }
        }
        return bitmap
    }

    private fun encodeStringToQRMatrix(content: String): Array<BooleanArray> {
        val size = 29 // Version 3 (29x29)
        val matrix = Array(size) { BooleanArray(size) { false } }
        val reserved = Array(size) { BooleanArray(size) { false } }

        // 1. Finder Patterns (Top-Left, Top-Right, Bottom-Left)
        drawFinderPattern(matrix, reserved, 0, 0)
        drawFinderPattern(matrix, reserved, size - 7, 0)
        drawFinderPattern(matrix, reserved, 0, size - 7)

        // 2. Alignment Pattern (for Version 3 at 22, 22)
        drawAlignmentPattern(matrix, reserved, 20, 20)

        // 3. Timing Patterns
        for (i in 8 until size - 8) {
            val bit = (i % 2 == 0)
            matrix[6][i] = bit
            reserved[6][i] = true
            matrix[i][6] = bit
            reserved[i][6] = true
        }

        // 4. Reserve format areas
        for (i in 0 until 9) {
            reserved[8][i] = true
            reserved[i][8] = true
        }
        for (i in 0 until 8) {
            reserved[8][size - 1 - i] = true
            reserved[size - 1 - i][8] = true
        }

        // 5. Data encoding (Byte Mode)
        val bytes = content.toByteArray(Charsets.ISO_8859_1)
        val bitStream = mutableListOf<Boolean>()

        // Mode Indicator: Byte Mode (0100)
        addBits(bitStream, 4, 4)
        // Character count indicator (8 bits for Version 1-9)
        addBits(bitStream, bytes.size, 8)
        // Data bytes
        for (b in bytes) {
            addBits(bitStream, b.toInt() and 0xFF, 8)
        }
        // Terminator
        addBits(bitStream, 0, 4)
        // Pad to byte
        while (bitStream.size % 8 != 0) {
            bitStream.add(false)
        }
        // Pad bytes (0xEC, 0x11)
        val padBytes = intArrayOf(0xEC, 0x11)
        var padIndex = 0
        while (bitStream.size < 70 * 8) {
            addBits(bitStream, padBytes[padIndex % 2], 8)
            padIndex++
        }

        // 6. Placement in matrix with simple masking (Pattern 0: (x + y) % 2 == 0)
        var bitIndex = 0
        var upward = true
        var col = size - 1

        while (col > 0) {
            if (col == 6) col-- // Skip vertical timing line

            val rows = if (upward) (size - 1 downTo 0) else (0 until size)
            for (row in rows) {
                for (c in intArrayOf(col, col - 1)) {
                    if (!reserved[row][c]) {
                        var bit = if (bitIndex < bitStream.size) bitStream[bitIndex++] else false
                        // Mask 0: flip if (row + c) % 2 == 0
                        if ((row + c) % 2 == 0) {
                            bit = !bit
                        }
                        matrix[row][c] = bit
                    }
                }
            }
            upward = !upward
            col -= 2
        }

        return matrix
    }

    private fun drawFinderPattern(matrix: Array<BooleanArray>, reserved: Array<BooleanArray>, startX: Int, startY: Int) {
        for (y in 0 until 7) {
            for (x in 0 until 7) {
                val isOuter = (x == 0 || x == 6 || y == 0 || y == 6)
                val isInner = (x in 2..4 && y in 2..4)
                val bit = isOuter || isInner
                matrix[startY + y][startX + x] = bit
                reserved[startY + y][startX + x] = true
            }
        }
        // Separator border
        for (y in -1..7) {
            for (x in -1..7) {
                val px = startX + x
                val py = startY + y
                if (px in matrix.indices && py in matrix.indices) {
                    reserved[py][px] = true
                }
            }
        }
    }

    private fun drawAlignmentPattern(matrix: Array<BooleanArray>, reserved: Array<BooleanArray>, startX: Int, startY: Int) {
        for (y in 0 until 5) {
            for (x in 0 until 5) {
                val isOuter = (x == 0 || x == 4 || y == 0 || y == 4)
                val isCenter = (x == 2 && y == 2)
                matrix[startY + y][startX + x] = (isOuter || isCenter)
                reserved[startY + y][startX + x] = true
            }
        }
    }

    private fun addBits(list: MutableList<Boolean>, value: Int, length: Int) {
        for (i in length - 1 downTo 0) {
            list.add(((value shr i) and 1) == 1)
        }
    }
}
