/* APEX RUN — mode application installable. Aucun SDK externe. */
(()=>{
  const button=document.getElementById('install-app');
  const guide=document.getElementById('install-guide');
  const info=document.getElementById('install-instructions');
  const close=document.getElementById('close-install-guide');
  const got=document.getElementById('got-install-guide');
  if(!button||!guide||!info)return;
  let deferredPrompt=null;
  const installed=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const ua=navigator.userAgent||'';
  const isApple=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isAndroid=/Android/i.test(ua);
  const safeOpen=()=>{guide.classList.remove('hidden');close.focus();};
  const safeClose=()=>{guide.classList.add('hidden');button.focus();};
  if(installed())button.classList.add('hidden');
  window.addEventListener('appinstalled',()=>{button.classList.add('hidden');deferredPrompt=null;guide.classList.add('hidden');});
  window.addEventListener('beforeinstallprompt',(event)=>{
    event.preventDefault();
    deferredPrompt=event;
    button.classList.remove('hidden');
  });
  button.addEventListener('click',async()=>{
    if(installed())return;
    if(deferredPrompt){
      const prompt=deferredPrompt;deferredPrompt=null;
      try{await prompt.prompt();await prompt.userChoice;}catch(e){console.warn('Installation indisponible :',e);}
      return;
    }
    if(isApple){
      info.textContent='Sur iPhone ou iPad : ouvre le jeu dans Safari, touche Partager (carré avec flèche), puis « Sur l’écran d’accueil ». Active « Ouvrir comme app » si proposé, puis « Ajouter ».';
    }else if(isAndroid){
      info.textContent='Sur Android : ouvre le jeu avec Chrome, puis appuie sur ⋮ > « Installer l’application » ou « Ajouter à l’écran d’accueil ». L’icône APEX RUN apparaîtra sur ton appareil.';
    }else{
      info.textContent='Sur ordinateur : ouvre le jeu dans Chrome ou Edge, puis choisis « Installer l’application » dans le menu ⋮ ou via l’icône d’installation dans la barre d’adresse.';
    }
    if(!window.isSecureContext){
      info.textContent+=' Pour installer le jeu depuis un autre appareil, il doit être hébergé avec une adresse HTTPS publique.';
    }
    safeOpen();
  });
  close.addEventListener('click',safeClose);
  got.addEventListener('click',safeClose);
  guide.addEventListener('click',(event)=>{if(event.target===guide)safeClose();});
  window.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!guide.classList.contains('hidden'))safeClose();});
  if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch((error)=>console.warn('Service worker non enregistré',error));
    });
  }
})();
