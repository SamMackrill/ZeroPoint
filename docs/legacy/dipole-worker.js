// dipole-worker.js

// Minimal THREE.js math objects needed (or import if available in worker context)
// For simplicity, let's assume basic structures are available or defined.
// In a real scenario, you might use importScripts() or modules if supported.

// --- Reusable Math Objects ---
// Basic Vector3-like structure/functions
const Vec3 = {
    create: (x = 0, y = 0, z = 0) => ({ x, y, z }),
    copy: (out, a) => { out.x = a.x; out.y = a.y; out.z = a.z; return out; },
    set: (out, x, y, z) => { out.x = x; out.y = y; out.z = z; return out; },
    normalize: (out, a) => {
        let x = a.x, y = a.y, z = a.z;
        let len = x * x + y * y + z * z;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            out.x = a.x * len;
            out.y = a.y * len;
            out.z = a.z * len;
        }
        return out;
    }
};

// Basic Quaternion-like structure/functions
const Quat = {
    create: () => ({ x: 0, y: 0, z: 0, w: 1 }),
    copy: (out, a) => { out.x = a.x; out.y = a.y; out.z = a.z; out.w = a.w; return out; },
    setFromAxisAngle: (out, axis, angle) => {
        const halfAngle = angle / 2, s = Math.sin(halfAngle);
        out.x = axis.x * s;
        out.y = axis.y * s;
        out.z = axis.z * s;
        out.w = Math.cos(halfAngle);
        return out;
    },
    multiply: (out, a, b) => {
        const ax = a.x, ay = a.y, az = a.z, aw = a.w;
        const bx = b.x, by = b.y, bz = b.z, bw = b.w;
        out.x = ax * bw + aw * bx + ay * bz - az * by;
        out.y = ay * bw + aw * by + az * bx - ax * bz;
        out.z = az * bw + aw * bz + ax * by - ay * bx;
        out.w = aw * bw - ax * bx - ay * by - az * bz;
        return out;
    },
    setFromEuler: (out, euler) => { // Assuming XYZ order for simplicity
        const x = euler.x, y = euler.y, z = euler.z;
        const c1 = Math.cos(x / 2);
        const c2 = Math.cos(y / 2);
        const c3 = Math.cos(z / 2);
        const s1 = Math.sin(x / 2);
        const s2 = Math.sin(y / 2);
        const s3 = Math.sin(z / 2);
        out.x = s1 * c2 * c3 + c1 * s2 * s3;
        out.y = c1 * s2 * c3 - s1 * c2 * s3;
        out.z = c1 * c2 * s3 + s1 * s2 * c3;
        out.w = c1 * c2 * c3 - s1 * s2 * s3;
        return out;
    }
};

// Basic Matrix4-like structure/functions
const Mat4 = {
    create: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
    compose: (out, position, quaternion, scale) => {
        const x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;
        const sx = scale.x, sy = scale.y, sz = scale.z;

        out[0] = (1 - (yy + zz)) * sx;
        out[1] = (xy + wz) * sx;
        out[2] = (xz - wy) * sx;
        out[3] = 0;
        out[4] = (xy - wz) * sy;
        out[5] = (1 - (xx + zz)) * sy;
        out[6] = (yz + wx) * sy;
        out[7] = 0;
        out[8] = (xz + wy) * sz;
        out[9] = (yz - wx) * sz;
        out[10] = (1 - (xx + yy)) * sz;
        out[11] = 0;
        out[12] = position.x;
        out[13] = position.y;
        out[14] = position.z;
        out[15] = 1;
        return out;
    },
    multiply: (out, a, b) => {
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
        let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        return out;
    },
    makeTranslation: (out, x, y, z) => {
        out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
        out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
        out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
        out[12] = x; out[13] = y; out[14] = z; out[15] = 1;
        return out;
    }
};

// --- Worker State ---
let dipoles = [];
let instanceIndices = [];
let activeDipoleIndices = [];
let maxDipoles = 0;
let params = {};
let lobeOffset = 0;

// Buffers for matrices to send back to main thread
// Using SharedArrayBuffer is ideal, but requires careful setup (COOP/COEP headers)
// Let's start with transferable ArrayBuffers for simplicity.
let redMatricesBuffer;
let blueMatricesBuffer;
let redMatrices; // Float32Array view
let blueMatrices; // Float32Array view

// Reusable objects for calculations
const dummyPosition = Vec3.create();
const dummyQuaternion = Quat.create();
const dummyScale = Vec3.create();
const dummyMatrix = Mat4.create();
const matrixOffsetRed = Mat4.create();
const matrixOffsetBlue = Mat4.create();
const finalMatrixRed = Mat4.create();
const finalMatrixBlue = Mat4.create();
const rotationDelta = Quat.create();
const tempAxis = Vec3.create();
const tempEuler = Vec3.create(); // For initial rotation

let lastTimestamp = 0;
let simulationRunning = false;

// --- Simulation Logic ---

function createDipole() {
    if (instanceIndices.length === 0) return;

    const instanceIndex = instanceIndices.pop();
    activeDipoleIndices.push(instanceIndex);

    const dipole = dipoles[instanceIndex];
    dipole.life = params.dipoleLifetime * (0.8 + Math.random() * 0.4);
    dipole.maxLife = dipole.life;
    dipole.maxScale = params.maxScaleBase * (1 + (Math.random() - 0.5) * 2 * params.scaleVariance);
    Vec3.normalize(dipole.axis, Vec3.set(tempAxis, Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5));
    dipole.instanceIndex = instanceIndex;

    const range = 4;
    Vec3.set(dipole.position,
        (Math.random() - 0.5) * range * 2,
        (Math.random() - 0.5) * range * 2,
        (Math.random() - 0.5) * range * 2
    );
    Quat.setFromEuler(dipole.quaternion, Vec3.set(tempEuler,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
    ));

    // Set initial matrix scale to near zero
    updateInstanceMatrix(dipole, 0.001);
}

function updateInstanceMatrix(dipole, scale) {
    const index = dipole.instanceIndex;
    const matrixIndex = index * 16; // Offset into the flat array

    // 1. Base matrix
    Vec3.set(dummyScale, scale, scale, scale);
    Mat4.compose(dummyMatrix, dipole.position, dipole.quaternion, dummyScale);

    // 2. Red Lobe Matrix
    Mat4.multiply(finalMatrixRed, dummyMatrix, matrixOffsetRed);
    redMatrices.set(finalMatrixRed, matrixIndex); // Update the buffer view

    // 3. Blue Lobe Matrix
    Mat4.multiply(finalMatrixBlue, dummyMatrix, matrixOffsetBlue);
    blueMatrices.set(finalMatrixBlue, matrixIndex); // Update the buffer view
}

function updateSimulation(timestamp) {
    if (!simulationRunning) return;

    const deltaTime = lastTimestamp > 0 ? (timestamp - lastTimestamp) / 1000 : 0.016; // ms to s
    lastTimestamp = timestamp;

    // Probability of creating a new dipole
    const createChance = params.creationProbability * deltaTime;
    if (Math.random() < createChance && instanceIndices.length > 0) {
        createDipole();
    }

    let updatedInstances = 0;

    for (let i = activeDipoleIndices.length - 1; i >= 0; i--) {
        const actualIndex = activeDipoleIndices[i];
        const dipole = dipoles[actualIndex];

        dipole.life -= deltaTime * params.speed;

        if (dipole.life <= 0) {
            updateInstanceMatrix(dipole, 0); // Hide
            instanceIndices.push(dipole.instanceIndex);
            activeDipoleIndices.splice(i, 1);
            dipole.life = 0; // Mark dead
            updatedInstances++;
        } else {
            const progress = (dipole.maxLife - dipole.life) / dipole.maxLife;
            const scale = Math.sin(progress * Math.PI) * dipole.maxScale;

            const rotationAmount = deltaTime * params.spinSpeed;
            Quat.setFromAxisAngle(rotationDelta, dipole.axis, rotationAmount);
            Quat.multiply(dipole.quaternion, rotationDelta, dipole.quaternion);

            updateInstanceMatrix(dipole, scale);
            updatedInstances++;
        }
    }

    // If matrices were updated, post them back to the main thread
    if (updatedInstances > 0) {
        // Post message with transferable buffers
        self.postMessage({
            type: 'matricesUpdate',
            redMatrices: redMatricesBuffer,
            blueMatrices: blueMatricesBuffer
        }, [redMatricesBuffer, blueMatricesBuffer]); // Transfer ownership

        // Recreate buffers and views for the next update cycle
        // (Main thread will send them back after using them)
         redMatricesBuffer = new ArrayBuffer(maxDipoles * 16 * 4);
         blueMatricesBuffer = new ArrayBuffer(maxDipoles * 16 * 4);
         redMatrices = new Float32Array(redMatricesBuffer);
         blueMatrices = new Float32Array(blueMatricesBuffer);
    }

    // Schedule next update
    requestAnimationFrame(updateSimulation);
}


// --- Message Handling ---
self.onmessage = function(e) {
    const data = e.data;

    switch (data.type) {
        case 'init':
            maxDipoles = data.maxDipoles;
            params = data.params;
            lobeOffset = data.lobeOffset;

            // Initialize state arrays
            dipoles = [];
            instanceIndices = [];
            activeDipoleIndices = [];
            for (let i = 0; i < maxDipoles; i++) {
                instanceIndices.push(i);
                dipoles.push({
                    life: 0, maxLife: 0, maxScale: 0,
                    axis: Vec3.create(),
                    instanceIndex: i,
                    position: Vec3.create(),
                    quaternion: Quat.create()
                });
            }

            // Initialize offset matrices
            Mat4.makeTranslation(matrixOffsetRed, 0, lobeOffset, 0);
            Mat4.makeTranslation(matrixOffsetBlue, 0, -lobeOffset, 0);

            // Initialize matrix buffers
            redMatricesBuffer = new ArrayBuffer(maxDipoles * 16 * 4); // 16 floats per matrix, 4 bytes per float
            blueMatricesBuffer = new ArrayBuffer(maxDipoles * 16 * 4);
            redMatrices = new Float32Array(redMatricesBuffer);
            blueMatrices = new Float32Array(blueMatricesBuffer);

            // Send initial empty matrices back immediately so main thread has buffers
             self.postMessage({
                type: 'matricesUpdate',
                redMatrices: redMatricesBuffer,
                blueMatrices: blueMatricesBuffer
            }, [redMatricesBuffer, blueMatricesBuffer]);
             redMatricesBuffer = new ArrayBuffer(maxDipoles * 16 * 4);
             blueMatricesBuffer = new ArrayBuffer(maxDipoles * 16 * 4);
             redMatrices = new Float32Array(redMatricesBuffer);
             blueMatrices = new Float32Array(blueMatricesBuffer);


            console.log('Worker initialized');
            break;

        case 'start':
            if (!simulationRunning) {
                simulationRunning = true;
                lastTimestamp = performance.now(); // Use performance.now() if available
                requestAnimationFrame(updateSimulation);
                console.log('Worker simulation started');
            }
            break;

        case 'stop':
            simulationRunning = false;
            console.log('Worker simulation stopped');
            break;

        case 'updateParams':
            params = { ...params, ...data.params };
            console.log('Worker params updated');
            break;

        case 'returnBuffers':
             // Main thread is returning ownership of the buffers
             redMatricesBuffer = data.redMatrices;
             blueMatricesBuffer = data.blueMatrices;
             redMatrices = new Float32Array(redMatricesBuffer);
             blueMatrices = new Float32Array(blueMatricesBuffer);
            break;

        default:
            console.error('Unknown message type received in worker:', data.type);
    }
};

console.log('Dipole worker loaded.');
