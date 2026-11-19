// Parcours originaux : distances en mètres, hauteurs incluses dans les points.
// Partagés logiquement avec l'identifiant de circuit contrôlé par le serveur.
export const TRACKS = [
  {
    id: 'alpine', name: 'ALPINE RUSH', subtitle: 'COLS & FALAISES',
    description: 'Cols de montagne, passerelles vertigineuses, deux sauts au-dessus du vide.',
    difficulty: 'INTERMÉDIAIRE', theme: 'alpine', width: 25, checkpoints: 7,
    sky: '#96c4e2', fog: '#a7c7d9', ground: '#426453', startY: 19,
    points: [
      [0, 26, 0], [105, 27, 58], [270, 34, 53], [428, 49, 9],
      [608, 60, 112], [735, 73, 290], [673, 88, 473], [480, 100, 525],
      [283, 110, 432], [154, 119, 525], [75, 139, 744], [-128, 141, 825],
      [-369, 129, 779], [-581, 118, 634], [-674, 97, 430], [-576, 82, 254],
      [-395, 73, 184], [-330, 62, 41], [-515, 45, -127], [-446, 37, -357],
      [-212, 31, -485], [55, 28, -439], [224, 28, -287], [168, 27, -105]
    ],
    jumps: [.215, .674], boosts: [.08, .43, .82],
    bank: [{t:.12, angle:.14, span:.052},{t:.30,angle:-.24,span:.044},{t:.50,angle:.20,span:.053},{t:.78,angle:-.22,span:.052}],
    scenery: {trees: 330, rocks: 105}
  },
  {
    id: 'coast', name: 'NEON COAST', subtitle: 'AUTOROUTE DU LITTORAL',
    description: 'Longues lignes droites, ponts au-dessus de la mer, grands virages relevés.',
    difficulty: 'FACILE À PRENDRE EN MAIN', theme: 'coast', width: 28, checkpoints: 7,
    sky: '#92d3eb', fog: '#a3d6e8', ground: '#397c70', startY: 12,
    points: [
      [0, 17, 0], [160, 17, 35], [373, 20, -55], [640, 30, -44],
      [845, 40, 133], [931, 53, 392], [853, 58, 675], [632, 56, 741],
      [425, 48, 632], [320, 44, 434], [172, 38, 442], [87, 36, 607],
      [-113, 30, 765], [-387, 28, 758], [-612, 29, 568], [-720, 32, 286],
      [-626, 26, 62], [-424, 20, -140], [-217, 18, -243], [-20, 17, -193]
    ],
    jumps: [.275, .732], boosts: [.11, .39, .62, .88],
    bank: [{t:.20,angle:.24,span:.055},{t:.32,angle:-.26,span:.052},{t:.57,angle:.24,span:.055},{t:.85,angle:-.17,span:.06}],
    scenery: {trees: 130, rocks: 85}
  },
  {
    id: 'canyon', name: 'CANYON X', subtitle: 'GRAND DÉSERT ROUGE',
    description: 'Montées extrêmes, falaises rouges, trois rampes et courbes inclinées.',
    difficulty: 'EXTRÊME', theme: 'canyon', width: 24, checkpoints: 8,
    sky: '#e7aa7c', fog: '#ddaf8c', ground: '#a4684a', startY: 14,
    points: [
      [0, 23, 0], [174, 32, 100], [425, 42, 64], [652, 62, 213],
      [706, 86, 482], [576, 100, 702], [340, 112, 688], [186, 97, 486],
      [-12, 109, 492], [-143, 132, 702], [-396, 140, 830], [-640, 129, 709],
      [-774, 110, 480], [-731, 92, 242], [-527, 79, 61], [-380, 61, -168],
      [-578, 46, -372], [-455, 28, -602], [-162, 21, -667], [103, 20, -514],
      [303, 20, -284], [146, 22, -105]
    ],
    jumps: [.165, .444, .787], boosts: [.08, .345, .615, .89],
    bank: [{t:.12,angle:.20,span:.057},{t:.27,angle:-.30,span:.055},{t:.52,angle:.30,span:.065},{t:.67,angle:-.26,span:.054},{t:.9,angle:.17,span:.05}],
    scenery: {trees: 0, rocks: 310}
  }
];
export const CAR_SPECS = [
  {name:'FALCON R',kind:'japan',inspired:'Coupé japonais • style GT-R',color:'#ffad37',top:325,acc:31,turn:1.79,grip:10.5,cost:0,tag:'STREET / 01'},
  {name:'NORD RS',kind:'round',inspired:'Sportive européenne • style 911',color:'#eef5fc',top:345,acc:33,turn:1.91,grip:11.1,cost:350,tag:'SPORT / 02'},
  {name:'STALLION V8',kind:'muscle',inspired:'Muscle car • style Mustang',color:'#ff4e59',top:370,acc:36,turn:1.62,grip:9.3,cost:650,tag:'POWER / 03'},
  {name:'VENOM EVO',kind:'wedge',inspired:'Supercar italienne • style Huracán',color:'#a3ff48',top:395,acc:39,turn:2.03,grip:11.7,cost:1100,tag:'SUPER / 04'},
  {name:'ROYAL HYPER',kind:'hyper',inspired:'Hypercar • style Chiron',color:'#56b6f6',top:425,acc:42,turn:1.94,grip:11.0,cost:1650,tag:'HYPER / 05'},
  {name:'FORMULA RX',kind:'formula',inspired:'Monoplace de compétition',color:'#e5caff',top:445,acc:45,turn:2.26,grip:12.5,cost:2500,tag:'RACING / 06'}
];
export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
export function circularDistance(a,b){ const d=Math.abs(a-b); return Math.min(d,1-d); }
export function bankAt(track,t) { return track.bank.reduce((sum,spot)=>sum+spot.angle*Math.exp(-Math.pow(circularDistance(t,spot.t)/spot.span,2)),0); }
export function jumpAt(track,t) { return track.jumps.some(j=>circularDistance(j,t)<.015); }
export function jumpOffset(track,t){
  let result=0;
  for (const j of track.jumps){
    const d=(t-j+1.5)%1-.5;
    if (d>-.008 && d<.0015) {
      const x=clamp((d+.008)/.0095,0,1);
      result+=5.2*x*x*(3-2*x);
    }
  }
  return result;
}
export function inGap(track,t){
  return track.jumps.some(j=>{const d=(t-j+1.5)%1-.5;return d>.0015&&d<.0125;});
}
