package com.snakeroyale.host

import android.Manifest
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.rule.GrantPermissionRule
import org.junit.After
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MainActivityInstrumentedTest {

    // Preempts the API 33+ runtime permission dialog, which MainActivity.checkPermissions()
    // triggers on launch and would otherwise steal window focus during the assertions below.
    @get:Rule
    val notificationPermissionRule: GrantPermissionRule =
        GrantPermissionRule.grant(Manifest.permission.POST_NOTIFICATIONS)

    private var scenario: ActivityScenario<MainActivity>? = null

    @After
    fun tearDown() {
        scenario?.close()
        ServerForegroundService.stopService(InstrumentationRegistry.getInstrumentation().targetContext)
    }

    @Test
    fun dashboardShowsTheServerUrlAndActionButtons() {
        scenario = ActivityScenario.launch(MainActivity::class.java)

        // These are always visible regardless of QR reachability (REQ-AND-002 gates only
        // ivQrCode/tvQrHint, which are mutually exclusive -- not asserted here).
        onView(withId(R.id.tvLanIpAddress)).check(matches(isDisplayed()))
        onView(withId(R.id.btnCopyIp)).check(matches(isDisplayed()))
        onView(withId(R.id.btnShare)).check(matches(isDisplayed()))
    }
}
