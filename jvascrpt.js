var gl; // Un variable global para el contexto WebGL

function initWebGL(canvas) {
    gl = null;

    try {
        // Tratar de tomar el contexto estandar. Si falla, retornar al experimental.
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    }
    catch(e) {
        alert("error trying to get canvas");
    }

    // Si no tenemos ningun contexto GL, date por vencido ahora
    if (!gl) {
        alert("Imposible inicializar WebGL. Tu navegador puede no soportarlo.");
        gl = null;
    }

    return gl;
}


var cubeRotation = 0.0;
var camY = 0.0;

function start() {

    var canvas = document.getElementById("glcanvas");

    gl = initWebGL(canvas);      // Inicializar el contexto GL

    // Solo continuar si WebGL esta disponible y trabajando

    if (gl) {
        // Vertex shader program

        const vsSource = `
attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying lowp vec4 vColor;

void main(void) {
gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
vColor = aVertexColor;
}
`;
        const fsSource = `
varying lowp vec4 vColor;

void main(void) {
gl_FragColor = vColor;
}
`;



        const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
        const programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            },
        };
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        const buffers = initBuffers(gl);
        const buffers2 = initSphere(gl);
        const buffers3 = cylinderBuffers(gl);
        const buffers4 = initLines(gl);

        var then = 0;

        function render(now){
            now *= 0.001; //Convertir a segundos
            const deltaTime = now - then;
            then = now;

            drawScene(gl, programInfo, buffers, buffers2, buffers4, deltaTime);

            requestAnimationFrame(render);
        }

        requestAnimationFrame(render);
    }


}

function initLines(gl){
    var vertexData = [
        2.0, 0.0, 2.0,
        0.0, 0.0, 2.0,
        2.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
    ];
    var indexData = [
        0, 1,
        1, 3,
        3, 2,
        2, 0,
    ];
    var colorData = [
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
    ];
    const circuitoVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circuitoVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);
    
    const circuitoIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circuitoIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    circuitoIndexBuffer.itemSize = 2;
    circuitoIndexBuffer.numItems = indexData.length;
    
    const circuitoColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circuitoColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);
    return {
        vertex: circuitoVertexBuffer,
        index: circuitoIndexBuffer,
        color: circuitoColorBuffer
    }
}

function initSphere(gl){
    var latitudeBands = 30;
    var longitudeBands = 30;
    var radius = 8;
    var vertexPositionData = [];
    var indexData = [];
    var colorData = [];
    for (var latNumber = 0; latNumber <= latitudeBands; latNumber++){
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        
        for (var longNumber = 0; longNumber <= longitudeBands; longNumber++){
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            
            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);
            colorData.push([Math.random(), Math.random(), Math.random(), 1]);
        }
    }
    
    for (var latNumber = 0; latNumber < latitudeBands; latNumber++){
        for (var longNumber = 0; longNumber < longitudeBands; longNumber++){
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;
            indexData.push(first, second, first + 1);
            indexData.push(second, second + 1, first + 1);
        }
    }
    
    var colors = [];
    for (var j = 0; j < colorData.length; ++j) {
        const c = colorData[j];

        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    indexBuffer.itemSize = 3;
    indexBuffer.numItems = indexData.length;
    
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    
    return {
        index: indexBuffer,
        vertex: vertexBuffer,
        color: colorBuffer,
    }
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
    var shader = gl.createShader(type);
    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function cylinderBuffers(gl){
    var height = (2-0.5);
    var sides = 30;
    var radius = 0.2;
    const a = 0, c = 0;
    const color = [0.0, 0.0, 0.0, 1.0];
    const theta = (Math.PI / 180) * (360/sides);
    var num = 0;
    var vertexPositionData = [];
    var indexData = [];
    var colorData = [];
    
    for (i = 0; i <= sides; i++){
        x = Math.cos(theta*i)*radius;
        z = Math.sin(theta*i)*radius;
        x2 = Math.cos(theta*(i+1))*radius;
        z2 = Math.sin(theta*(i+1))*radius;
        
        vertexPositionData.push([a, 0, c]);
        vertexPositionData.push([x, 0, z]);
        vertexPositionData.push([x2, 0, z2]);
        
        vertexPositionData.push([a, height, c]);
        vertexPositionData.push([x, height, z]);
        vertexPositionData.push([x2, height, z2]);
        
        indexData.push(num, num + 1, num + 2);
        indexData.push(num + 4, num + 1, num + 2);
        indexData.push(num + 4, num + 2, num + 5);
        indexData.push(num + 3, num + 4, num + 5);
        
        colorData.push(color);
        num += 6;
    }
    
    var colors = [];
    
    var colors = [];
    for (var j = 0; j < colorData.length; ++j) {
        const c = colorData[j];

        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }
    
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    indexBuffer.itemSize = 3;
    indexBuffer.numItems = indexData.length-1;
    
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    
    return {
        vertex: vertexBuffer,
        index: indexBuffer,
        color: colorBuffer,
    }
}

function initBuffers(gl) {

    // Create a buffer for the square's positions.

    const positionBuffer1 = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer1);

    // Now create an array of positions for the square.
    
   const positions2 = [
       1, 1, -6,
       -1, 1, -6,
       -1, -1, -4,
       1, -1, -4,
   ]

    const positions = [
        //Front face
        -1.0, -1.0,  1.0,
        1.0, -1.0,  1.0,
        1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,

        //Down face
        -1.0, -1.0,  1.0,
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0,  1.0,

        //Back face
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0,  1.0, -1.0,
        -1.0,  1.0, -1.0,

        //Top face
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0,
        1.0,  1.0, -1.0,
        1.0,  1.0,  1.0,

        //Right face
        1.0,  1.0,  1.0,
        1.0,  1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0,  1.0,

        //Left face
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0,
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,

    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionBuffer2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer2);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions2), gl.STATIC_DRAW);
    
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    
    

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.

    const indices = [
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23,   // left
    ];
    
    const indices2 = [
        0, 1, 2,    0, 2, 3,     // el cuadrao
    ]

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
                  new Uint16Array(indices), gl.STATIC_DRAW);
    
    const indexBuffer2 = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer2);
    
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.

    const faceColors = [
        [1.0,  1.0,  1.0,  1.0],    // Front face: white
        [1.0,  0.0,  0.0,  1.0],    // Back face: red
        [0.0,  1.0,  0.0,  1.0],    // Top face: green
        [0.0,  0.0,  1.0,  1.0],    // Bottom face: blue
        [1.0,  1.0,  0.0,  1.0],    // Right face: yellow
        [1.0,  0.0,  1.0,  1.0],    // Left face: purple
    ];
    
    const faceColors2 = [
        [1.0, 0.0, 1.0, 0.5],
    ]
    var colors2 = [];

    for (var j = 0; j < faceColors2.length; ++j) {
        const c = faceColors2[j];

        // Repeat each color four times for the four vertices of the face
        colors2 = colors2.concat(c, c, c, c);
    }

    const colorBuffer2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer2);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors2), gl.STATIC_DRAW);


    // Convert the array of colors into a table for all the vertices.

    var colors = [];

    for (var j = 0; j < faceColors.length; ++j) {
        const c = faceColors[j];

        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return {
        position: positionBuffer1,
        color: colorBuffer,
        indices: indexBuffer,
        position2: positionBuffer2,
        indices2: indexBuffer2,
        color2: colorBuffer2,
    };
}


function drawScene(gl, programInfo, buffers, buffers2, buffers4, deltaTime) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 10000.0;
    const projectionMatrix = mat4.create();


    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);
    
    //var cameraPoint = [4, camY, -5];
    var cameraPoint = [4, 2, -5];
    //mat4.translate(projectionMatrix, projectionMatrix, cameraPoint);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix1 = mat4.create();
    
    // Now move the drawing position a bit to where we want to
    // start drawing the square.
    //mat4.lookAt(modelViewMatrix1, cameraPoint, [0, 1, -7], [0, 1, 0]);
   


    mat4.translate(modelViewMatrix1,     // destination matrix
                   modelViewMatrix1,     // matrix to translate
                   [5.0, 3.0, -15.0]);  // amount to translate

    mat4.rotate(modelViewMatrix1, modelViewMatrix1, cubeRotation * 0.7, [0, 1, 0]);

    mat4.rotate(modelViewMatrix1, modelViewMatrix1, cubeRotation, [0, 0, 1]);
    
    
    
    const modelViewMatrix2 = mat4.create();
    
    mat4.translate(modelViewMatrix2, modelViewMatrix2, [5, -1, -9]);

     {
        const numComponents = 3;  // pull out 2 values per iteration
        const type = gl.FLOAT;    // the data in the buffer is 32bit floats
        const normalize = false;  // don't normalize
        const stride = 0;         // how many bytes to get from one set of values to the next
        // 0 = use type and numComponents above
        const offset = 0;         // how many bytes inside the buffer to start from.
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers4.vertex);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers4.index);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }


    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers4.color);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexColor);
    }
    
    gl.useProgram(programInfo.program);

    // Set the shader uniforms

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix1);
    {
        const vertexCount = buffers4.index.numItems;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.lineWidth(2);
        gl.drawElements(gl.LINES, vertexCount, type, offset);
    }

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 3;  // pull out 2 values per iteration
        const type = gl.FLOAT;    // the data in the buffer is 32bit floats
        const normalize = false;  // don't normalize
        const stride = 0;         // how many bytes to get from one set of values to the next
        // 0 = use type and numComponents above
        const offset = 0;         // how many bytes inside the buffer to start from.
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }


    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexColor);
    }

    // Tell WebGL to use our program when drawing

    gl.useProgram(programInfo.program);

    // Set the shader uniforms

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix1);

    {
        const vertexCount = 36;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        //gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
    
    {
        const numComponents = 3;  // pull out 2 values per iteration
        const type = gl.FLOAT;    // the data in the buffer is 32bit floats
        const normalize = false;  // don't normalize
        const stride = 0;         // how many bytes to get from one set of values to the next
        // 0 = use type and numComponents above
        const offset = 0;         // how many bytes inside the buffer to start from.
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position2);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices2);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }
    
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color2);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexColor);
    }
    
    gl.useProgram(programInfo.program);
    
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix2);
    
    {
        const vertexCount = 6;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        //gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
    
    
    //drawSphere(gl, programInfo, buffers2, camY);
    
    cubeRotation += deltaTime;
    if(camY < 5){
        camY += deltaTime;
    } else {
        camY = -3;
    }
}

function drawSphere (gl, programInfo, buffers, camY){
    
    
    var modelViewMatrix = mat4.create();
    //mat4.translate(modelViewMatrix, modelViewMatrix, center
    mat4.translate(modelViewMatrix, modelViewMatrix, [0, camY, -40]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, camY * 0.7, [10, 10, 0.5]);
    mat4.scale(modelViewMatrix, modelViewMatrix, [1, 1, 1]);
    
    prepareVertexPosition(gl, programInfo, buffers.vertex, buffers.index);
    prepareVertexColor(gl, programInfo, buffers.color);
    
    gl.useProgram(programInfo.program);
    
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
    
    gl.drawElements(gl.TRIANGLES, buffers.index.numItems, gl.UNSIGNED_SHORT, 0);
    
} 

function prepareVertexPosition(gl, programInfo, vertexBuffer, indexBuffer){
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

function prepareVertexColor(gl, programInfo, colorBuffer){
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
}

