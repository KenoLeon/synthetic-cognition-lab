// Headless probe: verify what Rapier's contact manifold reports for a sphere at rest.
import RAPIER from '@dimforge/rapier3d-compat';
await RAPIER.init();

const g = 9.81;
const world = new RAPIER.World({ x: 0, y: -g, z: 0 });
const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
const floor = world.createCollider(RAPIER.ColliderDesc.cuboid(5, 0.1, 5), floorBody);
const ball = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.6, 0));
const sphere = world.createCollider(
  RAPIER.ColliderDesc.ball(0.5).setDensity(1).setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS),
  ball);
const eq = new RAPIER.EventQueue(true);
const m = ball.mass();
console.log('dt', world.timestep, 'mass', m.toFixed(4), 'expected m*g', (m * g).toFixed(4));

for (let step = 0; step < 240; step++) {
  world.step(eq);
  let evForce = null;
  eq.drainContactForceEvents(e => { evForce = e.totalForceMagnitude(); });
  if (step % 60 === 59) {
    world.contactPair(sphere, floor, (man, flipped) => {
      let J = 0;
      const pts = [];
      for (let i = 0; i < man.numContacts(); i++) {
        J += man.contactImpulse(i);
        const p1 = man.localContactPoint1(i);
        pts.push(`[${p1.x.toFixed(3)},${p1.y.toFixed(3)},${p1.z.toFixed(3)}] d=${man.contactDist(i).toFixed(4)}`);
      }
      const n = man.normal();
      console.log(`step ${step} flipped=${flipped} nContacts=${man.numContacts()} nSolver=${man.numSolverContacts()}`,
        `normal=[${n.x.toFixed(2)},${n.y.toFixed(2)},${n.z.toFixed(2)}]`,
        `sumImpulse/dt=${(J / world.timestep).toFixed(4)} eventForce=${evForce?.toFixed(4)}`, pts.join(' '));
    });
  }
}
