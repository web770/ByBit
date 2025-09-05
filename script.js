let users = JSON.parse(localStorage.getItem("users")||"{}");
let currentUser = null;
let isAdmin = false;

let coins = [
 "bitcoin","ethereum","solana","cardano","xrp","binancecoin",
 "neo","vechain","gala","loopring","dogecoin","supra","aegro"
];
let fakeCoins = {supra:5, aegro:1};
let coinPrices={}, coinHistory={}, portfolio={};

coins.forEach(c=>coinHistory[c]=[]);

function showLogin(){
    document.getElementById("loginForm").style.display="block";
    document.getElementById("registerForm").style.display="none";
}
function showRegister(){
    document.getElementById("loginForm").style.display="none";
    document.getElementById("registerForm").style.display="block";
}
showLogin();

function register(){
    let u=document.getElementById("regUser").value;
    let p=document.getElementById("regPass").value;
    if(users[u]) return alert("Користувач існує");
    users[u]={pass:p,balance:100,portfolio:{}};
    localStorage.setItem("users",JSON.stringify(users));
    alert("Реєстрація успішна!");
    showLogin();
}
function login(){
    let u=document.getElementById("loginUser").value;
    let p=document.getElementById("loginPass").value;

    // спеціальний акаунт адміна
    if(u==="admin" && p==="admins123"){
        currentUser=u;
        isAdmin=true;
        portfolio={};
        virtualBalance=0;
    } else {
        if(!users[u]||users[u].pass!==p) return alert("Невірні дані");
        currentUser=u;
        isAdmin=false;
        portfolio=users[u].portfolio;
        virtualBalance=users[u].balance;
    }

    document.getElementById("authCard").style.display="none";
    document.getElementById("app").style.display="block";
    updateUI();
    renderUsers();
}

let virtualBalance=100;
let log=document.getElementById('log');
let select=document.getElementById('coinSelect');
coins.forEach(c=>{
    let o=document.createElement("option");
    o.value=c; o.textContent=c.toUpperCase();
    select.appendChild(o);
});

let ctx=document.getElementById('priceChart').getContext('2d');
let chart=new Chart(ctx,{type:'line',data:{labels:[],datasets:[{label:'Ціна',data:[],borderColor:'yellow'}]},options:{plugins:{legend:{display:false}}}});

function updateUI(msg){
    document.getElementById("balance").innerText=`Баланс: $${virtualBalance.toFixed(2)}`;
    let coinsText=Object.keys(portfolio).map(c=>{
        let qty=portfolio[c].amount||0;
        let avg=portfolio[c].avg||0;
        let cur=coinPrices[c]||avg;
        let change=avg?(((cur-avg)/avg)*100).toFixed(2):0;
        return `${c.toUpperCase()}: ${qty.toFixed(4)} (avg $${avg.toFixed(2)}, now $${cur}, ${change}% )`;
    }).join(" | ");
    document.getElementById("coins").innerText=coinsText||"У вас немає монет";
    if(msg){let d=document.createElement("div");d.innerText=msg;log.appendChild(d);}
    if(currentUser && !isAdmin){
        users[currentUser].balance=virtualBalance;
        users[currentUser].portfolio=portfolio;
        localStorage.setItem("users",JSON.stringify(users));
    }
}

function buy(){
    if(isAdmin) return alert("Адмін не торгує 🚫");
    let c=select.value; let a=parseFloat(document.getElementById("amount").value);
    let price=coinPrices[c]; let cost=a*price;
    if(cost>virtualBalance) return updateUI("Недостатньо коштів");
    virtualBalance-=cost;
    if(!portfolio[c]) portfolio[c]={amount:0,avg:0};
    let totalCost=portfolio[c].amount*portfolio[c].avg+cost;
    portfolio[c].amount+=a;
    portfolio[c].avg=totalCost/portfolio[c].amount;
    updateUI(`Куплено ${a} ${c.toUpperCase()} за $${cost.toFixed(2)}`);
}
function sell(){
    if(isAdmin) return alert("Адмін не торгує 🚫");
    let c=select.value; let a=parseFloat(document.getElementById("amount").value);
    if(!portfolio[c]||portfolio[c].amount<a) return updateUI("Недостатньо монет");
    let price=coinPrices[c]; let gain=a*price;
    virtualBalance+=gain;
    portfolio[c].amount-=a;
    updateUI(`Продано ${a} ${c.toUpperCase()} за $${gain.toFixed(2)}`);
}

async function fetchPrices(){
    try{
        let real=coins.filter(c=>!fakeCoins[c]).join(",");
        let res=await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${real}&vs_currencies=usd`);
        let data=await res.json();
        coins.forEach(c=>{
            coinPrices[c]=data[c]?.usd||fakeCoins[c]||(Math.random()*10+1);
            coinHistory[c].push(coinPrices[c]);
            if(coinHistory[c].length>30) coinHistory[c].shift();
        });
        updateChart();
        updateUI();
    }catch(e){console.log("API error",e);}
}
function updateChart(){
    let s=select.value;
    chart.data.labels=coinHistory[s].map((_,i)=>i+1);
    chart.data.datasets[0].data=coinHistory[s];
    chart.update();
}
fetchPrices(); setInterval(fetchPrices,10000);
select.addEventListener("change",updateChart);

// ----------------- список користувачів -----------------
function renderUsers(){
    let box=document.getElementById("usersList");
    box.innerHTML="";

    Object.keys(users).forEach(u=>{
        let div=document.createElement("div");
        div.className="user-item";
        if(isAdmin){
            div.innerText=`${u} | пароль: ${users[u].pass} | баланс: $${users[u].balance}`;
        } else {
            div.innerText=`${u} | баланс: $${users[u].balance}`;
        }
        div.onclick=()=>showUserPortfolio(u);
        box.appendChild(div);
    });
}

function showUserPortfolio(user){
    let data=users[user];
    if(!data) return;
    let list=Object.keys(data.portfolio||{}).map(c=>{
        let qty=data.portfolio[c].amount||0;
        return `${c.toUpperCase()}: ${qty.toFixed(4)}`;
    }).join(" | ");
    alert(`Портфель ${user}: ${list||"Порожній"}`);
}
