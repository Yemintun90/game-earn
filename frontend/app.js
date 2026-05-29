const firebaseConfig = {
  apiKey: "AIzaSyD30aooFqL4HMrpFfowBZBTicgvLPyjYfk",
  authDomain: "game-earn-718d5.firebaseapp.com",
  projectId: "game-earn-718d5",
  storageBucket: "game-earn-718d5.firebasestorage.app",
  messagingSenderId: "947907604340",
  appId: "1:947907604340:web:0567be36482979ec930621"
};

// FIREBASE INIT
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let spinCooldown = false;

// Lucky Spin အတွက် ပေါက်နိုင်မယ့် Coins ဆုကြေးများ
const rewards = [10, 20, 50, 100];

// AUTH STATE
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    loadCoins(user.uid);
    loadLeaderboard();

    if (user.email === "yt834434@gmail.com") {
      document.getElementById("adminSection").style.display = "block";
      loadWithdrawRequests();
    }
  }
});

// SIGNUP
function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert("Signup successful!");
    })
    .catch(err => alert(err.message));
}

// LOGIN
function checkAdmin(userEmail) {
    const adminEmail = "yt834434@gmail.com"; // သင်ပေးထားတဲ့ Admin Email
    const adminSection = document.getElementById("adminSection");

    if (userEmail === adminEmail) {
        if (adminSection) {
            adminSection.style.display = "block"; // Admin ဆိုရင် ပေါ်စေရမည်
        }
    } else {
        if (adminSection) {
            adminSection.style.display = "none"; // User ဆိုရင် ဖျောက်ထားမည်
        }
    }
    }
          

// LOAD COINS
function loadCoins(uid) {
  db.collection("users").doc(uid).onSnapshot(doc => {
    if (doc.exists) {
      document.getElementById("coins").innerText = doc.data().coins || 0;
    }
  });
}

// ADD COIN (PLAY BUTTON)
function addCoin() {
  if (!currentUser) {
    alert("Please login first!");
    return;
  }

  const ref = db.collection("users").doc(currentUser.uid);
  
  ref.get().then(doc => {
    let coins = doc.exists ? (doc.data().coins || 0) : 0;
    coins += 10; // +10 Coins ပေးခြင်း

    ref.set({ coins: coins }, { merge: true })
      .then(() => {
        console.log("Coins added successfully!");
      })
      .catch(err => console.error("Error adding coins: ", err));
  });
}

// LUCKY SPIN
function spinReward() {
  if (!currentUser) {
    alert("Login first");
    return;
  }

  if (spinCooldown) {
    alert("Please wait for cooldown");
    return;
  }

  spinCooldown = true;
  const spinBtn = document.getElementById("spinBtn");
  spinBtn.disabled = true;

  // Spin လှည့်သည့် Animation ပြုလုပ်ရန် CSS Class ထည့်ခြင်း
  const wheel = document.querySelector(".wheel");
  if (wheel) {
    wheel.classList.add("spin-anim");
  }

  setTimeout(() => {
    if (wheel) {
      wheel.classList.remove("spin-anim");
    }

    // Random ဆုကြေးရွေးချယ်ခြင်း
    const randomIndex = Math.floor(Math.random() * rewards.length);
    const reward = rewards[randomIndex];

    const ref = db.collection("users").doc(currentUser.uid);

    ref.get().then(doc => {
      let coins = doc.exists ? (doc.data().coins || 0) : 0;
      coins += reward;

      ref.set({ coins: coins }, { merge: true });

      document.getElementById("coins").innerText = coins;
      document.getElementById("spinResult").innerText = "🎉 You won " + reward + " coins!";
    });

    spinCooldown = false;
    spinBtn.disabled = false;
  }, 4000);
}

// WATCH AD
function watchAd(event) {
  if (!currentUser) {
    alert("Login first");
    return;
  }

  let seconds = 5;
  document.getElementById("adStatus").innerText = "Watching ad...";

  let adBtn = event.target;
  adBtn.disabled = true;

  let timer = setInterval(() => {
    seconds--;
    document.getElementById("adStatus").innerText = "Ad finishing in " + seconds + "s";

    if (seconds <= 0) {
      clearInterval(timer);
      adBtn.disabled = false;
      giveAdReward();
    }
  }, 1000);
}

function giveAdReward() {
  const ref = db.collection("users").doc(currentUser.uid);

  ref.get().then(doc => {
    let coins = doc.exists ? (doc.data().coins || 0) : 0;
    coins += 15;

    ref.set({ coins: coins }, { merge: true });
    document.getElementById("adStatus").innerText = "🎁 Reward claimed! +15 Coins";
  });
}


// METAMASK CONNECTION
async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      // Wallet ချိတ်ဆက်ရန် တောင်းဆိုခြင်း
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts[0];
      
      // Screen ပေါ်မှာ လိပ်စာပြပေးခြင်း
      document.getElementById("walletAddress").innerText = 
        walletAddress.substring(0, 6) + "..." + walletAddress.substring(walletAddress.length - 4);
      
      alert("Wallet connected successfully!");
    } catch (error) {
      alert("User denied wallet connection.");
    }
  } else {
    alert("MetaMask is not installed. Please use a crypto-enabled browser or app like Trust Wallet/MetaMask App browser.");
  }
}

// WITHDRAW
function withdraw() {
  if (!currentUser) {
    alert("Login first");
    return;
  }

  const amount = parseInt(document.getElementById("amount").value);
  const walletAddress = document.getElementById("walletAddress").innerText;

  if (!amount || amount <= 0) {
    alert("Enter a valid amount");
    return;
  }

  if (walletAddress === "Not connected") {
    alert("Please connect your wallet first!");
    return;
  }

  const ref = db.collection("users").doc(currentUser.uid);

  ref.get().then(doc => {
    let coins = doc.exists ? (doc.data().coins || 0) : 0;

    if (coins < amount) {
      alert("Insufficient coins!");
      return;
    }

    // Coins နှုတ်ယူခြင်း
    coins -= amount;
    ref.set({ coins: coins }, { merge: true });

    // ငွေထုတ်ရန် Request တောင်းဆိုမှုကို သိမ်းဆည်းခြင်း
    db.collection("withdraw_requests").add({
      uid: currentUser.uid,
      email: currentUser.email,
      amount: amount,
      walletAddress: walletAddress,
      status: "pending",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      document.getElementById("status").innerText = "Withdraw request submitted! ⏳";
      document.getElementById("amount").value = "";
    });
  });
}

// LEADERBOARD
function loadLeaderboard() {
  db.collection("users").orderBy("coins", "desc").limit(10).onSnapshot(snapshot => {
    let html = "<ol>";
    snapshot.forEach(doc => {
      html += `<li>User: ${doc.id.substring(0,5)}... - 💰 ${doc.data().coins || 0}</li>`;
    });
    html += "</ol>";
    document.getElementById("leaderboard").innerHTML = html;
  });
}

// ADMIN FUNCTIONS
function loadWithdrawRequests() {
  db.collection("withdraw_requests").where("status", "==", "pending").onSnapshot(snapshot => {
    let html = "<h3>Pending Requests</h3>";
    snapshot.forEach(doc => {
      const data = doc.data();
      html += `
        <div class="card" style="text-align:left; margin-bottom:10px;">
          <p><b>User:</b> ${data.email}</p>
          <p><b>Amount:</b> ${data.amount} Coins</p>
          <p><b>Wallet:</b> ${data.walletAddress}</p>
          <button onclick="approveWithdraw('${doc.id}')">✅ Approve</button>
        </div>
      `;
    });
    document.getElementById("adminSection").innerHTML = html;
  });
}

// ADMIN APPROVE (BACKEND SERVER ROUTE)
// app.js ရှိ approveWithdraw function ကို ဒီအတိုင်း ပြင်ပေးပါ
function approveWithdraw(requestId) {
    fetch("https://game-earn-black.vercel.app/approve-withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // အရေးကြီးချက် - ဒီနေရာမှာ requestId ကို object ပုံစံနဲ့ ပို့ရပါမယ်
        body: JSON.stringify({ requestId: requestId }) 
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("Request approved successfully!");
        } else {
            alert("Error: " + data.error);
        }
    })
    .catch(err => alert("Server error: " + err.message));
}

