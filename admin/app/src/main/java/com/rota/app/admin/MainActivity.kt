package com.rota.app.admin

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val endpoint = "https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota2-core?action=admin-stats"

    private lateinit var updated: TextView
    private val values = mutableMapOf<String, TextView>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 34, 28, 34)
            setBackgroundColor(0xFFF4F6F8.toInt())
        }
        scroll.addView(root)

        root.addView(TextView(this).apply {
            text = "ROTA Yönetim"
            textSize = 28f
            setTextColor(0xFF081329.toInt())
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })
        root.addView(TextView(this).apply {
            text = "Kayıt ve operasyon özeti"
            textSize = 15f
            setTextColor(0xFF5E6A79.toInt())
            setPadding(0, 4, 0, 20)
        })

        addCard(root, "customers", "Toplam Müşteri")
        addCard(root, "drivers", "Toplam Sürücü")
        addCard(root, "onlineDrivers", "Çevrimiçi Sürücü")
        addCard(root, "busyDrivers", "Meşgul Sürücü")
        addCard(root, "activeTrips", "Aktif Yolculuk")
        addCard(root, "completedTrips", "Tamamlanan Yolculuk")
        addCard(root, "cancelledTrips", "İptal Edilen Yolculuk")
        addCard(root, "totalTrips", "Toplam Yolculuk")

        updated = TextView(this).apply {
            text = "Veriler yükleniyor..."
            textSize = 13f
            setTextColor(0xFF667085.toInt())
            gravity = Gravity.CENTER
            setPadding(0, 18, 0, 18)
        }
        root.addView(updated)

        setContentView(scroll)
        refresh()
        mainHandler.postDelayed(object : Runnable {
            override fun run() {
                refresh()
                mainHandler.postDelayed(this, 10_000)
            }
        }, 10_000)
    }

    private fun addCard(root: LinearLayout, key: String, title: String) {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(22, 18, 22, 18)
            setBackgroundColor(0xFFFFFFFF.toInt())
        }
        val lp = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { setMargins(0, 0, 0, 14) }
        root.addView(card, lp)

        card.addView(TextView(this).apply {
            text = title
            textSize = 14f
            setTextColor(0xFF667085.toInt())
        })
        val value = TextView(this).apply {
            text = "—"
            textSize = 30f
            setTextColor(0xFF081329.toInt())
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, 5, 0, 0)
        }
        values[key] = value
        card.addView(value)
    }

    private fun refresh() {
        thread {
            try {
                val conn = URL(endpoint).openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 12000
                conn.readTimeout = 12000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write("{}".toByteArray()) }

                val code = conn.responseCode
                val text = (if (code in 200..299) conn.inputStream else conn.errorStream)
                    .bufferedReader().use { it.readText() }
                conn.disconnect()

                if (code !in 200..299) throw IllegalStateException(text)

                val json = JSONObject(text)
                val stats = json.getJSONObject("stats")
                mainHandler.post {
                    values.forEach { (key, view) ->
                        view.text = stats.optInt(key, 0).toString()
                    }
                    updated.text = "Canlı veriler • 10 saniyede bir yenilenir"
                }
            } catch (_: Exception) {
                mainHandler.post {
                    updated.text = "Veriler alınamadı. İnternet bağlantısını kontrol edin."
                }
            }
        }
    }
}
