package com.rota.app.driver

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject
import java.util.concurrent.Executors

class LocationTrackingService : Service(), LocationListener {
    companion object {
        const val ACTION_START = "com.rota.app.driver.START_TRACKING"
        const val ACTION_STOP = "com.rota.app.driver.STOP_TRACKING"
        const val EXTRA_DRIVER_ID = "driver_id"
        const val EXTRA_SESSION_TOKEN = "session_token"
        private const val CHANNEL_ID = "rota_live_location"
        private const val NOTIFICATION_ID = 7412
        private const val CORE_URL = "https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota2-core?action=heartbeat"
    }

    private lateinit var locationManager: LocationManager
    private val executor = Executors.newSingleThreadExecutor()
    @Volatile private var driverId: String = ""
    @Volatile private var sessionToken: String = ""
    @Volatile private var lastSentAt = 0L

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
        createChannel()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("ROTA Sürücü")
            .setContentText("Müşteriye canlı konumunuz gönderiliyor")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopTracking()
            stopSelf()
            return START_NOT_STICKY
        }
        driverId = intent?.getStringExtra(EXTRA_DRIVER_ID).orEmpty().ifBlank { driverId }
        sessionToken = intent?.getStringExtra(EXTRA_SESSION_TOKEN).orEmpty().ifBlank { sessionToken }
        if (driverId.isNotBlank()) startTracking()
        return START_STICKY
    }

    private fun startTracking() {
        val fine = ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!fine && !coarse) {
            stopSelf()
            return
        }
        try { locationManager.removeUpdates(this) } catch (_: Exception) {}
        try {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2500L, 3f, this)
        } catch (_: Exception) {}
        try {
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 3000L, 5f, this)
        } catch (_: Exception) {}
        try {
            val last = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
                .mapNotNull { p -> runCatching { locationManager.getLastKnownLocation(p) }.getOrNull() }
                .maxByOrNull { it.time }
            if (last != null) sendHeartbeat(last)
        } catch (_: Exception) {}
    }

    override fun onLocationChanged(location: Location) {
        sendHeartbeat(location)
    }

    @Deprecated("Deprecated in Java")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    private fun sendHeartbeat(location: Location) {
        val now = System.currentTimeMillis()
        if (driverId.isBlank() || now - lastSentAt < 2200L) return
        lastSentAt = now
        val id = driverId
        val token = sessionToken
        val lat = location.latitude
        val lng = location.longitude
        executor.execute {
            try {
                val conn = (URL(CORE_URL).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 8000
                    readTimeout = 8000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                }
                val body = JSONObject()
                    .put("driverId", id)
                    .put("sessionToken", token)
                    .put("lat", lat)
                    .put("lng", lng)
                    .toString()
                conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                conn.responseCode
                conn.disconnect()
            } catch (_: Exception) {}
        }
    }

    private fun stopTracking() {
        try { locationManager.removeUpdates(this) } catch (_: Exception) {}
    }

    override fun onDestroy() {
        stopTracking()
        executor.shutdownNow()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Canlı sürücü konumu", NotificationManager.IMPORTANCE_LOW)
            )
        }
    }
}
