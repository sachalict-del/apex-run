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
  },
  {
    id: 'skypark', name: 'SKY PARK', subtitle: 'PARC AÉRIEN',
    description: 'Grand huit aérien, quatre tremplins, ponts suspendus et virages relevés.',
    difficulty: 'SAUTS XXL', theme: 'coast', width: 29, checkpoints: 9,
    sky: '#80c9f5', fog: '#c2e3f2', ground: '#4c8a79', startY: 18,
    points: [
      [0,30,0],[190,35,10],[390,45,90],[540,70,275],[620,108,520],
      [500,135,730],[290,160,800],[90,145,650],[-120,125,660],
      [-330,125,850],[-570,110,830],[-760,90,635],[-790,70,400],
      [-680,62,195],[-480,78,85],[-410,110,-130],[-550,135,-320],
      [-420,110,-540],[-190,85,-620],[70,65,-525],[280,44,-310],[95,30,-125]
    ],
    jumps: [.105,.325,.56,.815], boosts: [.04,.23,.46,.7,.90],
    bank: [{t:.15,angle:.27,span:.058},{t:.35,angle:-.3,span:.06},{t:.61,angle:.32,span:.06},{t:.82,angle:-.26,span:.056}],
    scenery: {trees:100, rocks:110}
  },
  {
    id: 'volcano', name: 'VOLCANO RUSH', subtitle: 'VOLCAN & LAVE',
    description: 'Ascension volcanique, cinq tremplins, épingles serrées et descentes vertigineuses.',
    difficulty: 'TRÈS TECHNIQUE', theme: 'canyon', width: 26, checkpoints: 10,
    sky: '#de8b6a', fog: '#bf735d', ground: '#773d36', startY: 19,
    points: [
      [0,31,0],[180,41,60],[375,72,165],[490,115,365],[400,145,605],
      [155,177,735],[-80,187,630],[-260,210,770],[-505,230,730],
      [-690,198,510],[-620,165,285],[-390,157,175],[-345,195,-65],
      [-575,165,-250],[-600,100,-510],[-390,68,-670],[-130,46,-590],
      [110,38,-470],[310,48,-290],[155,32,-105]
    ],
    jumps:[.12,.28,.49,.69,.88], boosts:[.07,.225,.4,.6,.8,.945],
    bank:[{t:.1,angle:.23,span:.05},{t:.3,angle:-.34,span:.05},{t:.51,angle:.3,span:.055},{t:.71,angle:-.30,span:.052},{t:.88,angle:.22,span:.04}],
    scenery:{trees:0,rocks:300}
  },
  {
    id: 'forest', name: 'WILD FOREST', subtitle: 'FORÊT & CASCADES',
    description: 'Piste forestière rapide, chicanes, trois grands sauts et ponts élevés.',
    difficulty: 'RAPIDE & FUN', theme: 'alpine', width: 30, checkpoints: 8,
    sky:'#9accc7',fog:'#b1d8d1',ground:'#305941',startY:17,
    points:[
      [0,29,0],[220,38,80],[455,46,15],[685,60,150],[720,78,400],
      [600,97,605],[380,100,680],[180,105,490],[-25,120,550],
      [-145,145,785],[-380,135,800],[-600,100,625],[-705,85,365],
      [-585,72,155],[-340,55,95],[-285,65,-125],[-450,75,-305],
      [-350,51,-525],[-110,38,-610],[150,35,-435],[265,30,-210],[100,29,-95]
    ],
    jumps:[.18,.46,.77], boosts:[.06,.29,.58,.83],
    bank:[{t:.16,angle:.19,span:.07},{t:.35,angle:-.27,span:.054},{t:.57,angle:.25,span:.06},{t:.8,angle:-.2,span:.055}],
    scenery:{trees:490,rocks:95}
  },
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
