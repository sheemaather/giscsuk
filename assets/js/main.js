const slides=[...document.querySelectorAll(".hero-slide")]; let current=0;
function showSlide(n){current=(n+slides.length)%slides.length; slides.forEach((s,i)=>s.classList.toggle("active",i===current)); document.querySelectorAll(".hero-dot").forEach((d,i)=>d.classList.toggle("active",i===current));}
const dots=document.getElementById("dots"); slides.forEach((_,i)=>{const d=document.createElement("button");d.className="hero-dot";d.onclick=()=>showSlide(i);dots.appendChild(d)});showSlide(0);
document.getElementById("next").onclick=()=>showSlide(current+1);document.getElementById("prev").onclick=()=>showSlide(current-1);setInterval(()=>showSlide(current+1),6500);
fetch("/api/news").then(r=>r.json()).then(data=>document.getElementById("homeNews").innerHTML=data.slice(0,3).map(n=>`<div class="col-md-4"><article class="news-card"><span>${n.published_on}</span><h5>${n.title}</h5><p>${n.body}</p><a href="news.html">Read more →</a></article></div>`).join("")).catch(()=>{});
document.getElementById("year").textContent=new Date().getFullYear();
