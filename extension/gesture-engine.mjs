// A deliberate gesture is emitted only on release, with hysteresis and re-arming.
export class GestureEngine {
  constructor({mode='eyes',hold=650,cooldown=2200,thresholds={eyes:.5,mouth:.2}}={}) {this.mode=mode;this.hold=hold;this.cooldown=cooldown;this.thresholds={...thresholds};this.lastFire=-Infinity;this.reset();}
  reset(){this.since=null;this.neutralSince=null;this.armed=false;this.lastFrame=null;}
  update(face,t){
    if(!face || (this.lastFrame!==null && t-this.lastFrame>450)){this.reset();if(!face)return {progress:0,state:'lost'};}
    this.lastFrame=t;
    const limit=this.thresholds[this.mode];
    const active=this.mode==='mouth'?face.mouth>=limit:face.left>=limit&&face.right>=limit;
    const neutralLimit=limit*.45;
    const neutral=this.mode==='mouth'?face.mouth<neutralLimit:face.left<neutralLimit&&face.right<neutralLimit;
    if(!this.armed){
      if(neutral){this.neutralSince??=t;if(t-this.neutralSince>=350&&t-this.lastFire>=this.cooldown)this.armed=true;}else this.neutralSince=null;
      return {progress:0,state:t-this.lastFire<this.cooldown?'cooldown':'neutral'};
    }
    if(active){this.since??=t;const dt=t-this.since;return {progress:Math.min(1,dt/this.hold),state:dt>2500?'too-long':'holding'};}
    if(this.since!==null&&neutral){const dt=t-this.since;this.since=null;this.armed=false;this.neutralSince=t;
      if(dt>=this.hold&&dt<=2500&&t-this.lastFire>=this.cooldown){this.lastFire=t;return {progress:1,state:'trigger',trigger:true};}
    }
    return {progress:0,state:'ready'};
  }
}
