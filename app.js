// app.js
import { docRef, countRef, settingsRef, msgRef, db } from './firebase-config.js';
import { onSnapshot, getDoc, updateDoc, setDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let core = {}; 
let path = []; 
let v2Enabled = false;

// --- UI Helpers ---
const showToast = (m) => { 
    const t = document.getElementById('toast'); 
    t.innerText = m; 
    t.style.display = 'block'; 
    setTimeout(() => t.style.display = 'none', 2500); 
};

// --- Rendering Logic ---
function render() {
    const grid = document.getElementById('mainGrid');
    const notes = document.getElementById('notesArea');
    const navHeader = document.getElementById('navHeader');
    const viewTitle = document.getElementById('viewTitle');
    
    grid.innerHTML = ''; 
    notes.style.display = 'none'; 
    grid.style.display = 'grid';

    // Update Breadcrumbs
    const bc = document.getElementById('bc');
    bc.innerHTML = '';
    
    const homeSpan = document.createElement('span');
    homeSpan.className = 'bc-link';
    homeSpan.innerText = 'Home';
    homeSpan.onclick = () => { path = []; render(); };
    bc.appendChild(homeSpan);

    path.forEach((p, i) => {
        bc.innerHTML += ` <i class="fa-solid fa-chevron-right" style="font-size:0.7rem; margin:0 5px; opacity:0.5;"></i> `;
        const link = document.createElement('span');
        link.className = 'bc-link';
        link.innerText = p;
        link.onclick = () => { path = path.slice(0, i + 1); render(); };
        bc.appendChild(link);
    });
    
    navHeader.style.display = path.length > 0 ? 'flex' : 'none';
    if(path.length > 0) viewTitle.innerText = path[path.length - 1];

    let target = core; 
    path.forEach(p => target = target[p]);
    if(!target) { path = []; render(); return; }

    if(target._type === 'subject') {
        grid.style.display = 'none'; 
        notes.style.display = 'block';
        const list = document.getElementById('unitList'); 
        list.innerHTML = '';
        
        (target.units || []).forEach((u, i) => {
            const hasVid = target.vids && target.vids[i];
            const item = document.createElement('div');
            item.className = 'unit-item';
            item.onclick = () => handleUnitClick(i, target);
            item.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <i class="fa-solid fa-file-pdf" style="color:#e74c3c; margin-right:15px; font-size:1.2rem;"></i>
                    <span style="font-weight:500;">${u}</span>
                </div>
                <div style="display:flex; gap:20px; align-items:center;">
                    ${hasVid ? `<i class="fa-brands fa-youtube yt-play" style="color:#FF0000; font-size:1.6rem;"></i>` : ''}
                    <i class="fa-solid fa-arrow-up-right-from-square" style="color:var(--primary); opacity:0.7;"></i>
                </div>`;
            
            if(hasVid) {
                item.querySelector('.yt-play').onclick = (e) => {
                    e.stopPropagation();
                    playVid(target.vids[i], u);
                };
            }
            list.appendChild(item);
        });
    } else {
        const keys = Object.keys(target)
            .filter(k => !k.startsWith('_'))
            .sort((a,b) => (target[a]._rank || 999) - (target[b]._rank || 999));
        
        keys.forEach(k => {
            let icon = path.length === 0 ? "fa-graduation-cap" : "fa-book-bookmark";
            const card = document.createElement('div');
            card.className = 'card';
            card.onclick = () => { path.push(k); render(); window.scrollTo(0,0); };
            card.innerHTML = `
                <i class="fa-solid ${icon}" style="font-size:2.8rem; color:var(--primary); margin-bottom:20px; display:block;"></i>
                <h3 style="font-size:1.1rem;">${k}</h3>`;
            grid.appendChild(card);
        });
    }
}

// --- Interaction Handlers ---
const handleUnitClick = (idx, target) => {
    let link = target.links[idx];
    let name = target.units[idx];

    if(v2Enabled) {
        document.getElementById('v2-loader').style.display='flex';
        setTimeout(()=> { 
            document.getElementById('v2-loader').style.display='none'; 
            window.open(link, '_blank'); 
        }, 1000);
    } else {
        document.getElementById('v-name').innerText = name;
        document.getElementById('v-frame').src = link.includes('drive.google.com') ? link.replace('/view', '/preview') : link;
        document.getElementById('viewer').style.display='flex';
        document.body.style.overflow = 'hidden';
    }
};

const playVid = (url, title) => { 
    let id = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
    document.getElementById('v-video-name').innerText = title;
    document.getElementById('video-frame').src = `https://www.youtube.com/embed/${id}?autoplay=1`;
    document.getElementById('video-viewer').style.display='flex';
};

// --- Firebase Listeners ---
onSnapshot(docRef, (s) => { if(s.exists()){ core = s.data(); render(); } });
onSnapshot(settingsRef, (s) => { if(s.exists()){ v2Enabled = s.data().v2Enabled; } });

// --- Event Listeners ---
document.getElementById('globalBackBtn').onclick = () => { path.pop(); render(); };
document.getElementById('help-btn').onclick = () => document.getElementById('help-panel').style.display='flex';
document.getElementById('closeHelpX').onclick = () => document.getElementById('help-panel').style.display='none';
document.getElementById('closeViewerBtn').onclick = () => {
    document.getElementById('viewer').style.display='none'; 
    document.getElementById('v-frame').src=''; 
    document.body.style.overflow = 'auto';
};
document.getElementById('closeVideoBtn').onclick = () => {
    document.getElementById('video-viewer').style.display='none'; 
    document.getElementById('video-frame').src=''; 
};

document.getElementById('searchInput').onkeyup = (e) => {
    let q = e.target.value.toLowerCase();
    document.querySelectorAll('.card, .unit-item').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
};

document.getElementById('sendReportBtn').onclick = async () => {
    const text = document.getElementById('helpMsg').value;
    if(!text.trim()) return;
    try {
        const msgData = { text, time: new Date().toLocaleString(), location: path.join(' > ') || 'Home' };
        const snap = await getDoc(msgRef);
        if (!snap.exists()) await setDoc(msgRef, { inbox: [msgData] });
        else await updateDoc(msgRef, { inbox: arrayUnion(msgData) });
        
        document.getElementById('helpMsg').value = ''; 
        showToast("Report Sent Successfully!"); 
        document.getElementById('help-panel').style.display='none';
    } catch(e) { 
        showToast("Error sending report.");
    }
};

// --- Visitor Counter ---
async function updateCounter() {
    try {
        await updateDoc(countRef, { count: increment(1) });
        const snap = await getDoc(countRef);
        document.getElementById('view-count').innerText = snap.data().count.toLocaleString();
    } catch(e) {
        await setDoc(countRef, { count: 1 }, { merge: true });
        document.getElementById('view-count').innerText = "1";
    }
}
updateCounter();
