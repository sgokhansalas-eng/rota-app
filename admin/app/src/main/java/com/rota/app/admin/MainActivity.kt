package com.rota.app.admin

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import android.app.AlertDialog
import android.text.InputType
import org.json.JSONArray
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val endpoint = "https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota2-core?action=admin-stats"

    private lateinit var updated: TextView
    private lateinit var approvals: LinearLayout
    private lateinit var approvalStatus: TextView
    private lateinit var emailInput: EditText
    private lateinit var otpInput: EditText
    private var adminAccessToken: String = ""
    private val supa = "https://ftltemgtzkjfnkxsxxmd.supabase.co"
    private val reviewUrl = supa + "/functions/v1/rota2-women-review"
    private val publicKey = "sb_publishable_2d5xkUbWQECxv8jyaq2-Bg_sc-Qo8cr"
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

        adminAccessToken = getSharedPreferences("rota_admin_auth", MODE_PRIVATE).getString("token", "") ?: ""
        addApprovals(root)
        setContentView(scroll)
        refresh()
        if (adminAccessToken.isNotBlank()) loadApprovals()
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

    private fun note(textValue: String, fontSize: Float = 14f): TextView {
        return TextView(this).apply { text = textValue; textSize = fontSize; setTextColor(0xFF081329.toInt()); setPadding(0, 9, 0, 9) }
    }

    private fun addApprovals(root: LinearLayout) {
        root.addView(note("Kadın Sürücü / Kadın Yolcu Onayları", 21f))
        root.addView(note("Bu alan yalnızca yetkili yöneticiye açıktır. Onay için isimden veya fotoğraftan cinsiyet tahmini yapılmaz.", 12f))
        emailInput = EditText(this).apply {
            hint = "Yönetici e-posta adresi"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            setSingleLine(true)
            setText("S.gokhan.salas@gmail.com")
        }
        root.addView(emailInput)
        root.addView(Button(this).apply { text = "E-posta kodu gönder"; setOnClickListener { sendOtp() } })
        otpInput = EditText(this).apply {
            hint = "Gelen doğrulama kodu"
            inputType = InputType.TYPE_CLASS_NUMBER
            setSingleLine(true)
        }
        root.addView(otpInput)
        root.addView(Button(this).apply { text = "Kodu doğrula"; setOnClickListener { verifyOtp() } })
        root.addView(Button(this).apply { text = "Bekleyen başvuruları yenile"; setOnClickListener { loadApprovals() } })
        root.addView(Button(this).apply {
            text = "Yönetici çıkışı"
            setOnClickListener {
                adminAccessToken = ""
                getSharedPreferences("rota_admin_auth", MODE_PRIVATE).edit().remove("token").apply()
                approvals.removeAllViews()
                approvalStatus.text = "Oturum kapatıldı."
            }
        })
        approvalStatus = note("Başvuruları görmek için e-posta ile yönetici girişini yapın.")
        root.addView(approvalStatus)
        approvals = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(approvals)
    }

    private fun request(url: String, method: String = "GET", payload: JSONObject? = null, token: String = ""): Pair<Int,String> {
        val con = URL(url).openConnection() as HttpURLConnection
        return try {
            con.requestMethod = method
            con.connectTimeout = 12000
            con.readTimeout = 12000
            con.setRequestProperty("Accept", "application/json")
            if (url.contains("/auth/v1/")) con.setRequestProperty("apikey", publicKey)
            if (token.isNotEmpty()) con.setRequestProperty("Authorization", "Bearer " + token)
            if (payload != null) {
                con.doOutput = true
                con.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                con.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            }
            val code = con.responseCode
            val stream = if (code in 200..299) con.inputStream else con.errorStream
            code to (stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: "")
        } finally { con.disconnect() }
    }

    private fun sendOtp() {
        val email = emailInput.text.toString().trim()
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            approvalStatus.text = "Geçerli e-posta adresi girin."; return
        }
        approvalStatus.text = "Doğrulama kodu gönderiliyor..."
        thread {
            try {
                val (code, _) = request(supa + "/auth/v1/otp", "POST", JSONObject().put("email", email).put("create_user", false))
                mainHandler.post { approvalStatus.text = if (code in 200..299) "E-postanıza gelen kodu girin." else "Kod gönderilemedi. Yönetici hesabı henüz kayıtlı olmayabilir." }
            } catch (e: Exception) {
                mainHandler.post { approvalStatus.text = "Kod gönderilemedi: " + (e.message ?: "Bağlantı hatası") }
            }
        }
    }

    private fun verifyOtp() {
        val email = emailInput.text.toString().trim()
        val code = otpInput.text.toString().trim()
        if (code.isBlank()) { approvalStatus.text = "E-postaya gelen kodu girin."; return }
        approvalStatus.text = "Kod kontrol ediliyor..."
        thread {
            try {
                val (status, response) = request(supa + "/auth/v1/verify", "POST", JSONObject().put("email", email).put("token", code).put("type", "email"))
                val token = if (status in 200..299) JSONObject(response).optString("access_token") else ""
                mainHandler.post {
                    if (token.isBlank()) approvalStatus.text = "Kod doğrulanamadı."
                    else {
                        adminAccessToken = token
                        getSharedPreferences("rota_admin_auth", MODE_PRIVATE).edit().putString("token", token).apply()
                        otpInput.text.clear()
                        loadApprovals()
                    }
                }
            } catch (_: Exception) { mainHandler.post { approvalStatus.text = "Doğrulama yapılamadı." } }
        }
    }

    private fun loadApprovals() {
        if (adminAccessToken.isBlank()) {
            approvalStatus.text = "Önce yönetici olarak doğrulanın."; return
        }
        approvalStatus.text = "Başvurular yükleniyor..."
        thread {
            try {
                val (code, response) = request(reviewUrl, token = adminAccessToken)
                val json = JSONObject(response)
                if (code !in 200..299) throw IllegalStateException(json.optString("error", "Yönetici yetkisi yok veya oturum süresi doldu."))
                val rows = json.optJSONArray("applications") ?: JSONArray()
                mainHandler.post {
                    approvals.removeAllViews()
                    approvalStatus.text = "Başvuru sayısı: " + rows.length()
                    for (i in 0 until rows.length()) displayApplication(rows.getJSONObject(i))
                }
            } catch (e: Exception) {
                mainHandler.post {
                    approvals.removeAllViews()
                    approvalStatus.text = "Onay listesi açılamadı: " + (e.message ?: "Yönetici girişini kontrol edin.")
                }
            }
        }
    }

    private fun displayApplication(item: JSONObject) {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(18, 16, 18, 16)
            setBackgroundColor(0xFFFFFFFF.toInt())
        }
        approvals.addView(box, LinearLayout.LayoutParams(-1, -2).apply { setMargins(0, 0, 0, 14) })
        val role = if (item.optString("role") == "driver") "Kadın sürücü" else "Kadın yolcu"
        box.addView(note(role + " • " + item.optString("name", "Bilinmiyor"), 16f))
        box.addView(note(item.optString("phone", "Telefon gizli") + " | Başvuru: " + item.optString("createdAt"), 12f))
        val state = item.optString("status")
        box.addView(note("Durum: " + when (state) { "pending" -> "Bekliyor"; "approved" -> "Onaylandı"; else -> "Reddedildi / kapatıldı" }, 12f))
        if (state != "pending" && state != "approved") return
        val noteInput = EditText(this).apply { hint = "İnceleme notu"; maxLines = 2 }
        box.addView(noteInput)
        val actions = LinearLayout(this)
        box.addView(actions)
        val decisions = if (state == "pending") listOf("approve" to "Onayla", "reject" to "Reddet") else listOf("revoke" to "Yetkiyi kaldır")
        for ((decision, title) in decisions) {
            actions.addView(Button(this).apply {
                text = title
                setOnClickListener {
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle(title)
                        .setMessage("Bu başvuru için işlemi onaylıyor musunuz?")
                        .setNegativeButton("İptal", null)
                        .setPositiveButton("Evet") { _, _ ->
                            decide(item.optString("id"), decision, noteInput.text.toString())
                        }.show()
                }
            }, LinearLayout.LayoutParams(0, -2, 1f))
        }
    }

    private fun decide(id: String, decision: String, noteText: String) {
        if (adminAccessToken.isBlank()) return
        approvalStatus.text = "Karar kaydediliyor..."
        thread {
            try {
                val payload = JSONObject().put("applicationId", id).put("decision", decision).put("note", noteText.take(500))
                val (status, response) = request(reviewUrl, "POST", payload, adminAccessToken)
                if (status !in 200..299) throw IllegalStateException(JSONObject(response).optString("error", "İşlem başarısız"))
                mainHandler.post { loadApprovals() }
            } catch (e: Exception) {
                mainHandler.post { approvalStatus.text = "İşlem kaydedilemedi: " + (e.message ?: "Bağlantı hatası") }
            }
        }
    }

}
