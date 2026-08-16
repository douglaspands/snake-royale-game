package com.snakeroyale.host

import android.content.Context
import android.util.Log
import java.io.File

/**
 * Copies a subtree of the APK's `assets/` into application-private storage.
 *
 * APK assets are entries inside the package archive, not filesystem paths, so the
 * embedded Python server -- which serves through Starlette's FileResponse and
 * StaticFiles, both of which take real paths -- cannot read them in place. See
 * REQ-AND-003.
 */
object AssetExtractor {

    private const val TAG = "SnakeAssetExtractor"
    private const val MARKER = ".extracted_version"

    data class Result(val dir: File, val fileCount: Int)

    /**
     * Extracts [assetPath] into `filesDir/[assetPath]`, returning the destination and
     * the number of files present.
     *
     * The extraction is keyed on [versionCode] rather than on the destination merely
     * existing: Vite emits content-hashed bundle names, so an upgrade that reused a
     * previously extracted tree would serve an old `index.html` referencing chunks
     * that no longer exist, and the app would fail with a 404 instead of visibly
     * degrading. See design.md Decision 2.
     */
    fun extract(context: Context, assetPath: String, versionCode: Int): Result {
        val target = File(context.filesDir, assetPath)
        val marker = File(target, MARKER)

        if (marker.isFile && marker.readText().trim() == versionCode.toString()) {
            val count = countFiles(target)
            Log.i(TAG, "Assets for version $versionCode already extracted ($count files)")
            return Result(target, count)
        }

        Log.i(TAG, "Extracting '$assetPath' for version $versionCode into ${target.absolutePath}")
        target.deleteRecursively()
        target.mkdirs()

        val copied = copyRecursively(context, assetPath, target)

        // Written last: a marker present alongside a partial copy would make the next
        // launch skip a re-extraction it needs.
        if (copied > 0) {
            marker.writeText(versionCode.toString())
        } else {
            Log.e(TAG, "Extraction of '$assetPath' produced no files; the APK may not bundle it")
        }

        Log.i(TAG, "Extracted $copied file(s)")
        return Result(target, copied)
    }

    private fun copyRecursively(context: Context, assetPath: String, target: File): Int {
        val assets = context.assets
        // list() returns an empty array for files and for missing paths alike, so a
        // leaf is identified by successfully opening it rather than by the listing.
        val children = try {
            assets.list(assetPath) ?: emptyArray()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to list asset path '$assetPath'", e)
            return 0
        }

        if (children.isEmpty()) {
            return if (copyFile(context, assetPath, target)) 1 else 0
        }

        var count = 0
        for (child in children) {
            val childAsset = "$assetPath/$child"
            val childTarget = File(target, child)
            val grandChildren = try {
                assets.list(childAsset) ?: emptyArray()
            } catch (e: Exception) {
                emptyArray<String>()
            }
            if (grandChildren.isEmpty()) {
                if (copyFile(context, childAsset, childTarget)) count++
            } else {
                childTarget.mkdirs()
                count += copyRecursively(context, childAsset, childTarget)
            }
        }
        return count
    }

    private fun copyFile(context: Context, assetPath: String, target: File): Boolean {
        return try {
            target.parentFile?.mkdirs()
            context.assets.open(assetPath).use { input ->
                target.outputStream().use { output -> input.copyTo(output) }
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to copy asset '$assetPath'", e)
            false
        }
    }

    private fun countFiles(dir: File): Int =
        dir.walkTopDown().count { it.isFile && it.name != MARKER }
}
