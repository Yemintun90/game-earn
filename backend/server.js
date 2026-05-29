const express = require('express');
const cors = require('cors'); // ၁။ ဒီမှာ cors ကို ခေါ်ပါ
const admin = require('firebase-admin');
require("dotenv").config();

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

// ၂။ ဒီနေရာမှာ cors ကို enable လုပ်ပေးပါ (အရေးကြီးဆုံးနေရာပါ)
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ... ကျန်တဲ့ သင့်ရဲ့ route တွေ (approve-withdraw စသည်ဖြင့်) ကို ဒီအောက်မှာ ဆက်ရေးပါ ...


// APPROVE WITHDRAW (ငွေထုတ်ရန် အတည်ပြုခြင်း)
app.post("/approve-withdraw", async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: "requestId is required" });
    }

    const withdrawRef = db.collection("withdraw_requests").doc(requestId);
    const withdrawDoc = await withdrawRef.get();

    if (!withdrawDoc.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    const data = withdrawDoc.data();

    if (data.status === "approved") {
      return res.json({ message: "Already approved" });
    }

    // UPDATE STATUS
    await withdrawRef.update({
      status: "approved",
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: "Withdraw approved"
    });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ error: err.message });
  }
});

// REJECT WITHDRAW (ငွေထုတ်ရန် ငြင်းပယ်ခြင်းနှင့် Coins ပြန်ပေးခြင်း)
app.post("/reject-withdraw", async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: "requestId is required" });
    }

    const withdrawRef = db.collection("withdraw_requests").doc(requestId);
    const withdrawDoc = await withdrawRef.get();

    if (!withdrawDoc.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    const data = withdrawDoc.data();

    if (data.status === "rejected") {
      return res.json({ message: "Already rejected" });
    }

    // STATUS ကို REJECTED ပြောင်းလဲခြင်း
    await withdrawRef.update({
      status: "rejected",
      rejectedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // အသုံးပြုသူထံသို့ Coins ပြန်လည်ထည့်သွင်းပေးခြင်း (Refund)
    const userRef = db.collection("users").doc(data.uid);
    const userDoc = await userRef.get();

    let coins = userDoc.exists ? (userDoc.data().coins || 0) : 0;
    coins += data.amount;

    await userRef.set({ coins: coins }, { merge: true });

    res.json({
      success: true,
      message: "Withdraw rejected & refunded"
    });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ error: err.message });
  }
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
