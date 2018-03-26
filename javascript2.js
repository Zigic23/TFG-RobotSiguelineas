var gl; // Un variable global para el contexto WebGL
var modelMatrix;
var viewMatrix;   
var modelViewMatrix;
var programInfo;
var projectionMatrix;

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
        programInfo = {
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

        var then = 0;

        function render(now){
            now *= 0.001; //Convertir a segundos
            const deltaTime = now - then;
            then = now;

            drawScene(gl, programInfo, buffers, deltaTime);

            requestAnimationFrame(render);
        }

        requestAnimationFrame(render);
    }


}

//
// Initializing buffers
//
function initBuffers(gl){
    var cylinderSideVertices=[];
    var cylinderTopVertices=[];
    var cylinderBotVertices=[];
    a=0, b=0, y=0; //The origin
    r = 1.0, g = 1.0, b = 1.0, al = 1.0;
    rbt = 1.0, gbt = 0.0, bbt = 0.0;
    theta = (Math.PI/180) * (360/40);
    for (i =0;i<=40;i++){
       x =  Math.cos(theta*i); 
       z =  Math.sin(theta*i);

      cylinderBotVertices.push(x, y, z); //Bottomvertices
      cylinderBotVertices.push(rbt, gbt, bbt, al); //Color for bottom vertices

      cylinderSideVertices.push(x, y, z); //Sidevertices along the bottom
      cylinderSideVertices.push(r,g,b,al); //Vertex color
      cylinderSideVertices.push(x, y+2, z); //Sidevertices along the top with y = 2
      cylinderSideVertices.push(r,g,b,al); //Vertex color

      cylinderTopVertices.push(x, y+2, z); //Topvertices with y = 2
      cylinderTopVertices.push(rbt, gbt, bbt, al); //Color for top vertices
    }
    
    cylinderBotArray = new Float32Array(cylinderBotVertices); //Vertices for the bottom
    cylinderSideArray = new Float32Array(cylinderSideVertices); //Vertices for the sides
    cylinderTopArray = new Float32Array(cylinderTopVertices); //Vertices for the top


    //Vertex buffer for TOP
    vertexBufferCylinderTop = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferCylinderTop);
    gl.bufferData(gl.ARRAY_BUFFER, cylinderTopArray, gl.STATIC_DRAW);
    vertexBufferCylinderTop.nmbrOfVertices = cylinderTopArray.length/7;
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Vertexbuffer for BOTTOM
    vertexBufferCylinderBot = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferCylinderBot);
    gl.bufferData(gl.ARRAY_BUFFER, cylinderBotArray, gl.STATIC_DRAW);
    vertexBufferCylinderBot.nmbrOfVerticess = cylinderBotArray.length/7; //xyz + rgba = 7
    gl.bindBuffer(gl.ARRAY_BUFFER, null);


    //Vertex buffer for cylinder SIDES
    vertexBufferCylinderSide = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferCylinderSide);
    gl.bufferData(gl.ARRAY_BUFFER, cylinderSideArray, gl.STATIC_DRAW);
    vertexBufferCylinderSide.nmbrOfVertices = cylinderSideArray.length / 7; //xyz + rgba = 7
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    return{
        topVertex: vertexBufferCylinderTop,
        botVertex: vertexBufferCylinderBot,
        sideVertex: vertexBufferCylinderSide,
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

function drawScene(gl, programInfo, buffers, deltaTime) {
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
    const zFar = 1000.0;
    projectionMatrix = mat4.create();


    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
        // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);
    
    modelMatrix = mat4.create();
    viewMatrix = mat4.create();   
    modelViewMatrix = mat4.create();
    
    mat4.lookAt(viewMatrix, [0,0,0], [0, 0, -5], [0, 1, 0]);
    
    drawCylinderTop();
   drawCylinderBot();
   drawCylinderSide();
    
    //prepareVertex(gl, programInfo, buffers.positions, buffers.index, //buffers.colors);
    
    //gl.useProgram(programInfo.program);
    
    //gl.uniformMatrix4fv(
    //    programInfo.uniformLocations.projectionMatrix,
    //    false,
    //    projectionMatrix);
    //gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    
    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
    
    //gl.drawElements(gl.TRIANGLES, buffers.index.numItems, gl.UNSIGNED_SHORT, 0);

}


function prepareVertex(gl, programInfo, vertexBuffer, indexBuffer, colorBuffer){
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
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        4,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
}

function drawCylinderTop(){
   var stride = (3 + 4)*4; //4 bytes per vertex
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferCylinderBot);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        3,
        gl.FLOAT,
        false,
        stride,
        0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

   var colorOffset = 3 * 4;
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        4,
        gl.FLOAT,
        false,
        stride,
        colorOffset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.useProgram(programInfo.program);
    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexBufferCylinderTop.nmbrOfVertices);
}

function drawCylinderBot(){

   var stride = (3 + 4)*4; //4 bytes per vertex
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferCylinderBot);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        3,
        gl.FLOAT,
        false,
        stride,
        0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

   var colorOffset = 3 * 4;
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        4,
        gl.FLOAT,
        false,
        stride,
        colorOffset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.useProgram(programInfo.program);
    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
   gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
   gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

   gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexBufferCylinderBot.nmbrOfVertices);   
}

function drawCylinderSide(){

 //Stride = number of bytes per vertex (pos+color).
  var stride = (3 + 4)*4; //4 bytes per vertex
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferCylinderBot);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        3,
        gl.FLOAT,
        false,
        stride,
        0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

   var colorOffset = 3 * 4;
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        4,
        gl.FLOAT,
        false,
        stride,
        colorOffset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.useProgram(programInfo.program);
    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
   gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
   gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix); 

   gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexBufferCylinderSide.nmbrOfVertices);

}