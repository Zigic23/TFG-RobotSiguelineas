var gl; // Un variable global para el contexto WebGL
var programInfo;

 // Para cambiar entre orthographic y perspective
var ortho = false;
var mvMatrixStack = [];
var modelMatrix = mat4.create();
var projectionMatrix = mat4.create();
var viewMatrix = mat4.create();
var currentlyPressedKeys = {};
var circuito = [];
var circuitoPoints = [];
var circuitoIndex = [];
var circuitoColor = [];
var circuitoBool = false;
var calcularSensores = false;
var fofView = 90;

// Constantes del robot
var ANCHO = 10.0;   // Ancho del vehículo
var LARGO = 15.0;   // Largo del vehículo
var DR = 10.0;      // Distancia entre ruedas
var DS = 4.0;       // Distancia entre sensores
var RS = 3.0;       // Distancia entre los ejes Ruedas-Sensores
var RR = 2.0;       // Radio Rueda
var V = 0.1;        // Velocidad lineal (m/s)
var RC = 30.0;      // Radio de la camara al coche
var camX = 0.0;     // Posicion de la camara
var camZ = 0.0;
var rotCamera = 0.0;// Rotación de la camara sobre el coche
var AC = 0.0;       // Angulo de la cámara.

// Estado del robot
var desX = 0.0, desZ = 0.0; // Posición
var rotX = 0.0, rotY = 0.0; // Orientación
var si   = 1.0, sd   = 1.0; // Sensores

// Simulación en "tiempo real"
var DT = 0.01;              // Paso de la simulación
var milisegundos = 10;      // Tempo entre repintados

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
        
        canvas.addEventListener("wheel", scroll);
        
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
        //Inicializo buffers -------------------------------------------------------------------------Aqui esta el circuito inicializado
        const circuitoBuffer = circuitBuffer(gl);
        const buffers = initBuffers(gl);
        
        //Si se inserta un documento se guarda en arrays para posteriormente pasarse al buffer
        document.getElementById('circuitoFile').onchange = function(){
            var myFileInput = document.getElementById('circuitoFile');
            var myFile = myFileInput.files[0];
            saveFileToArray(myFile);
        };
        
        function saveFileToArray(file)
        {
            const reader = new FileReader();
            reader.onload = (event) => {
                const file = event.target.result;
                const allLines = file.split(/\r\n|\n/);
                var i = 0;
                //Se mapean todas las coordenadas del circuito (añadiendo la altura ya que no viene en el archivo)
                allLines.map((line) => {
                    var nums = line.split("  ");
                    circuito.push(parseFloat(nums[0]));
                    circuito.push(0);
                    circuito.push(parseFloat(nums[1]));
                    circuitoPoints.push([parseFloat(nums[0]), 0, parseFloat(nums[1])]);
                    circuitoIndex.push((i%allLines.length));
                    circuitoIndex.push(((i+1)%allLines.length));
                    circuitoColor.push([1.0, 1.0, 1.0, 1.0]);
                    circuitoColor.push([1.0, 1.0, 1.0, 1.0]);
                    circuitoColor.push([1.0, 1.0, 1.0, 1.0]);
                    circuitoColor.push([1.0, 1.0, 1.0, 1.0]);
                    i++;
                })
                //Aqui se llama a la funcion que pasa los valores al buffer, si no lo hago aqui no espera a que termine de mapearse todo.
                resetCircuitBuffer(circuitoBuffer);
            }
            reader.onerror = (evt) => {
                alert(evt.target.error.name);
            };

            reader.readAsText(file);
        }
        
        var then = 0; 
        document.onkeydown = handleKeyDown;
        document.onkeyup = handleKeyUp;

        function render(now){
            now *= 0.001; //Convertir a segundos
            const deltaTime = now - then;
            then = now;

            //Si el circuito se ha introducido se pasa también.
            if(circuitoBool){
                drawScene(gl, programInfo, buffers, deltaTime, circuitoBuffer);
            } else {
                drawScene(gl, programInfo, buffers, deltaTime);
            }

            requestAnimationFrame(render);
        }

        requestAnimationFrame(render);
    }
}

function initBuffers(gl){
    var cubeBuffer = cubeBuffers(gl);
    var sphereBuffer = sphereBuffers(gl);
    var cylinderBuffer = cylinderBuffers(gl);
    return {
        cube: cubeBuffer,
        sphere: sphereBuffer,
        cylinder: cylinderBuffer
    }
}

// ------------------------------------------------- Aqui se cargan los datos al circuito -------------------
function resetCircuitBuffer(buffers){
    circuitoBool = true;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circuito), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(circuitoIndex), gl.STATIC_DRAW);
    buffers.index.itemSize = 2;
    buffers.index.numItems = circuitoIndex.length;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circuitoColor), gl.STATIC_DRAW);
    var boton = document.getElementById('botonCircuito');
    boton.style.display = "block";
}

// ------------------------------------------- Aqui se inicializan los buffers --------------------------------
function circuitBuffer(gl){
    const circuitoVertexBuffer = gl.createBuffer();
    //gl.bindBuffer(gl.ARRAY_BUFFER, circuitoVertexBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circuito), gl.STATIC_DRAW);
    
    const circuitoIndexBuffer = gl.createBuffer();
    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circuitoIndexBuffer);
    //gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(circuitoIndex), gl.STATIC_DRAW);
    //circuitoIndexBuffer.itemSize = 2;
    //circuitoIndexBuffer.numItems = circuitoIndex.length;
    
    const circuitoColorBuffer = gl.createBuffer();
    //gl.bindBuffer(gl.ARRAY_BUFFER, circuitoColorBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circuitoColor), gl.STATIC_DRAW);
    
    return {
        vertex: circuitoVertexBuffer,
        index: circuitoIndexBuffer,
        color: circuitoColorBuffer
    }
}

function cubeBuffers(gl){
    
    const cubeVertex = [
        -1, -1, -1,
        -1, -1,  1,
        -1,  1, -1,
        -1,  1,  1,
         1, -1, -1,
         1, -1,  1,
         1,  1, -1,
         1,  1,  1,
    ];
    
    const cubeIndex = [
        3, 1, 5,  3, 5, 7,
        7, 5, 4,  7, 4, 6,
        2, 3, 7,  2, 7, 6,
        2, 0, 1,  2, 1, 3,
        1, 0, 4,  1, 4, 5,
        6, 4, 0,  6, 0, 2,
    ];
    
    const cubeColorsWhite = [
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0, 1.0],
    ];
    const cubeColorsRed = [
        [1.0, 0.0, 0.0, 1.0],
        [1.0, 0.0, 0.0, 1.0],
        [1.0, 0.0, 0.0, 1.0],
        [1.0, 0.0, 0.0, 1.0],
        [1.0, 0.0, 0.0, 1.0],
        [1.0, 0.0, 0.0, 1.0],
    ];
    const cubeColorsGrey = [
        [0.2, 0.0, 0.0, 1.0],
        [0.0, 0.0, 0.2, 1.0],
        [0.0, 0.2, 0.0, 1.0],
        [0.2, 0.0, 0.0, 1.0],
        [0.0, 0.2, 0.0, 1.0],
        [0.0, 0.0, 0.2, 1.0],
    ];
    const cubeColorsBlack = [
        [0.0, 0.0, 0.0, 1.0],
        [0.0, 0.0, 0.0, 1.0],
        [0.0, 0.0, 0.0, 1.0],
        [0.0, 0.0, 0.0, 1.0],
        [0.0, 0.0, 0.0, 1.0],
        [0.0, 0.0, 0.0, 1.0],
    ];
    //Preparar buffers del cubo
    //Buffer de vértices
    const cubeVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertex), gl.STATIC_DRAW);
    //Buffer de indices (el orden en el que se van a usar para crear los triángulos)
    const cubeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeIndex), gl.STATIC_DRAW);
    cubeIndexBuffer.itemSize = 3;
    cubeIndexBuffer.numItems = cubeIndex.length;
    //Preparamos colores para el cubo
    var colors = [];

    for (var j = 0; j < cubeColorsWhite.length; ++j) {
        const c = cubeColorsWhite[j];

        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }
    
    var colorsRed = [];

    for (var j = 0; j < cubeColorsRed.length; ++j) {
        const c = cubeColorsRed[j];

        // Repeat each color four times for the four vertices of the face
        colorsRed = colorsRed.concat(c, c, c, c);
    }
    
    var colorsGrey = [];

    for (var j = 0; j < cubeColorsGrey.length; ++j) {
        const c = cubeColorsGrey[j];

        // Repeat each color four times for the four vertices of the face
        colorsGrey = colorsGrey.concat(c, c, c, c);
    }
    
    var colorsBlack = [];

    for (var j = 0; j < cubeColorsBlack.length; ++j) {
        const c = cubeColorsBlack[j];

        // Repeat each color four times for the four vertices of the face
        colorsBlack = colorsBlack.concat(c, c, c, c);
    }
    const cubeColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    
    const cubeColorRedBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorRedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorsRed), gl.STATIC_DRAW);

    const cubeColorGreyBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorGreyBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorsGrey), gl.STATIC_DRAW);
    
    const cubeColorBlackBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorBlackBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorsBlack), gl.STATIC_DRAW);
    return {
        vertex: cubeVertexBuffer,
        index: cubeIndexBuffer,
        color: cubeColorBuffer,
        colorRed: cubeColorRedBuffer,
        colorGrey: cubeColorGreyBuffer,
        colorBlack: cubeColorBlackBuffer
    }
}

function cylinderBuffers(gl){
    var height = (RR-0.5);
    var sides = 30;
    var radius = 0.2;
    const a = 0, c = 0;
    const color = [0.0, 0.0, 0.0, 1.0];
    const theta = (Math.PI / 180) * (360/sides);
    var num = 0;
    var vertexPositionData = [];
    var indexData = [];
    var colorData = [];
    
    for (i = 0; i < sides; i++){
        x = Math.cos(theta*i)*radius;
        z = Math.sin(theta*i)*radius;
        x2 = Math.cos(theta*(i+1))*radius;
        z2 = Math.sin(theta*(i+1))*radius;
        
        vertexPositionData.push(a);
        vertexPositionData.push(0);
        vertexPositionData.push(c);
        vertexPositionData.push(x);
        vertexPositionData.push(0);
        vertexPositionData.push(z);
        vertexPositionData.push(x2);
        vertexPositionData.push(0);
        vertexPositionData.push(z2);
        
        vertexPositionData.push(a);
        vertexPositionData.push(height);
        vertexPositionData.push(c);
        vertexPositionData.push(x);
        vertexPositionData.push(height);
        vertexPositionData.push(z);
        vertexPositionData.push(x2);
        vertexPositionData.push(height);
        vertexPositionData.push(z2);
        
        indexData.push(num, num + 1, num + 2);
        indexData.push(num + 4, num + 1, num + 2);
        indexData.push(num + 4, num + 2, num + 5);
        indexData.push(num + 3, num + 4, num + 5);
        
        for (j = 0; j < 32; j++){
             colorData.push(color);
        }
        num += 6;
    }
    
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    indexBuffer.itemSize = 16;
    indexBuffer.numItems = indexData.length;
    
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);
    
    return {
        vertex: vertexBuffer,
        index: indexBuffer,
        color: colorBuffer,
    }
}

function sphereBuffers(gl){
    var latitudeBands = 25;
    var longitudeBands = 25;
    var radius = 1;
    var vertexPositionData = [];
    var indexData = [];
    var colorBlueData = [];
    var colorGreenData = [];
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
            colorBlueData.push([0.0, 0.0, 0.0, 1]);
            colorGreenData.push([0.0, 1.0, 0.0, 0.5]);
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
    for (var j = 0; j < colorBlueData.length; ++j) {
        const c = colorBlueData[j];

        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }
    
    var colorsGreen = [];
    for (var j = 0; j < colorGreenData.length; ++j) {
        const c = colorGreenData[j];

        // Repeat each color four times for the four vertices of the face
        colorsGreen = colorsGreen.concat(c, c, c, c);
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
    
    var colorGreenBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorGreenBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorsGreen), gl.STATIC_DRAW);
    
    return {
        vertex: vertexBuffer,
        index: indexBuffer,
        color: colorBuffer,
        colorGreen: colorGreenBuffer
    }
}


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

//Dibujamos la escena
function drawScene(gl, programInfo, buffers, deltaTime, circuitoBuffer) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
    
    //Inicializamos las matrices
    
    modelMatrix = mat4.create();
    projectionMatrix = mat4.create();
    viewMatrix = mat4.create();

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    const fieldOfView = fofView * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 1000.0;

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    if(ortho){
        const left = -fofView, right = fofView, bottom = -fofView*0.75, top = fofView*0.75, nplane = 1, fplane = 1000;
        mat4.ortho(projectionMatrix, left, right, bottom, top, nplane, fplane);
        
        const eye    = [desX , fofView, desZ];
        const center = [desX,  0.0,  desZ];
        const up     = [0.0, 0.0, 1.0];


        mat4.lookAt(viewMatrix, eye, center, up);
    } else {
        mat4.perspective(projectionMatrix,
                         fieldOfView,
                         aspect,
                         zNear,
                         zFar);
        
        const eye    = [camX, 75.0,  camZ];
        //const eye    = [0.0, 50.0,  0.0];
        const center = [desX,  0.0,  desZ];
        const up     = [0.0, 1.0, 0.0];


        mat4.lookAt(viewMatrix, eye, center, up);
    }
    
    //Esto es para una base temporal para poder ver bien como se movía el robot
    drawBase(buffers);
    if(circuitoBool){
        //Pintamos el circuito en caso de que se hayan rellenado bien los buffers
        drawCircuito(circuitoBuffer);
    }
    
    mat4.translate(modelMatrix, modelMatrix, [desX, (RR-0.5), desZ]);
    mat4.rotate(modelMatrix, modelMatrix, rotY * Math.PI /180, [0.0, 1.0, 0.0]);
    
    drawCuerpo(buffers);
    drawRuedasDelanteras(buffers);
    drawSensores(buffers);
    
    
    
    funTimer(deltaTime);
}

function drawCuerpo(buffers){
    mvPushMatrix();
        mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -(LARGO - RS)]);
        mat4.scale(modelMatrix, modelMatrix, [ANCHO, 1.0, LARGO]);
        drawModelWired(buffers.cube, buffers.cube.colorBlack);
        drawModel(buffers.cube);
    mvPopMatrix();
}

function drawRuedasDelanteras(buffers){
    const distRueda = DR + 1.0;
    mvPushMatrix();
        mat4.translate(modelMatrix, modelMatrix, [-distRueda, 0.0, 0.0]);
        drawRuedaDelantera(buffers);
        mat4.translate(modelMatrix, modelMatrix, [2*distRueda, 0.0, 0.0]);
        drawRuedaDelantera(buffers);
    mvPopMatrix();
}

function drawRuedaDelantera(buffers){
    mvPushMatrix();
        mat4.rotate(modelMatrix, modelMatrix,- rotX * Math.PI /180, [1.0, 0.0, 0.0]);
        mat4.rotate(modelMatrix, modelMatrix, 90 * Math.PI /180, [0.0, 0.0, 1.0]);
        mat4.scale(modelMatrix, modelMatrix, [RR,RR/2, RR]);
        drawModel(buffers.sphere, buffers.sphere.colorGreen);
        drawModelWired(buffers.sphere);
    mvPopMatrix();
}

function drawSensores(buffers){
    const distSensor = DS/2.0;
    mvPushMatrix();
        mat4.translate(modelMatrix, modelMatrix, [-distSensor, -(RR-0.5), RS]);
        drawSensor(buffers);
        mat4.translate(modelMatrix, modelMatrix, [2*distSensor, 0, 0]);
        drawSensor(buffers);
    mvPopMatrix();
}

function drawSensor(buffers){
    drawModel(buffers.cylinder);
    drawModelWired(buffers.cube, buffers.cube.colorBlack);
    drawModel(buffers.cube, buffers.cube.colorRed);
}

function drawBase(buffers){
    mvPushMatrix();
        mat4.translate(modelMatrix, modelMatrix, [0.0, -5.0, 0.0]);
        mat4.scale(modelMatrix, modelMatrix, [500.0, 1.0, 500.0]);
        drawModel(buffers.cube, buffers.cube.colorGrey);
    mvPopMatrix();
}

function mvPushMatrix(m) {
  if (m) {
    mvMatrixStack.push(mat4.clone(m));
    modelMatrix = mat4.clone(m);
  } else {
    mvMatrixStack.push(mat4.clone(modelMatrix));
  }
}

function mvPopMatrix() {
  if (!mvMatrixStack.length) {
    throw("Can't pop from an empty matrix stack.");
  }
  
  modelMatrix = mvMatrixStack.pop();
  return modelMatrix;
}

function drawModel(cube, colors){
    {
        const numComponents = 3;  // pull out 3 values per iteration
        const type = gl.FLOAT;    // the data in the buffer is 32bit floats
        const normalize = false;  // don't normalize
        const stride = 0;         // how many bytes to get from one set of values to the next
        // 0 = use type and numComponents above
        const offset = 0;         // how many bytes inside the buffer to start from.
        gl.bindBuffer(gl.ARRAY_BUFFER, cube.vertex);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.index);
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

    if(colors == null){
        {
            const numComponents = 4;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, cube.color);
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
    } else {
        {
            const numComponents = 4;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, colors);
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
    }
    
    
    gl.useProgram(programInfo.program);
    const modelViewMatrix = mat4.create();
    mat4.mul(modelViewMatrix, viewMatrix, modelMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    
    {
        const vertexCount = cube.index.numItems;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
    
}

function drawModelWired(cube, colors){
    {
        const numComponents = 3;  // pull out 3 values per iteration
        const type = gl.FLOAT;    // the data in the buffer is 32bit floats
        const normalize = false;  // don't normalize
        const stride = 0;         // how many bytes to get from one set of values to the next
        // 0 = use type and numComponents above
        const offset = 0;         // how many bytes inside the buffer to start from.
        gl.bindBuffer(gl.ARRAY_BUFFER, cube.vertex);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.index);
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

    if(colors == null){
        {
            const numComponents = 4;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, cube.color);
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
    } else {
        {
            const numComponents = 4;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, colors);
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
    }
    
    
    gl.useProgram(programInfo.program);
    const modelViewMatrix = mat4.create();
    mat4.mul(modelViewMatrix, viewMatrix, modelMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    
    {
        const vertexCount = cube.index.numItems;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.LINE_STRIP, vertexCount, type, offset);
    }
    
}

//Funcion para pintar el circuito cuando nos lo pasen
function drawCircuito(circuitosBuffer){
    //Saco los bufferes y los bindeo para pasarlo al programa
    {
        const numComponents = 3;  // pull out 2 values per iteration
        const type = gl.FLOAT;    // the data in the buffer is 32bit floats
        const normalize = false;  // don't normalize
        const stride = 0;         // how many bytes to get from one set of values to the next
        // 0 = use type and numComponents above
        const offset = 0;         // how many bytes inside the buffer to start from.
        gl.bindBuffer(gl.ARRAY_BUFFER, circuitosBuffer.vertex);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circuitosBuffer.index);
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
        gl.bindBuffer(gl.ARRAY_BUFFER, circuitosBuffer.color);
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
    const modelViewMatrix = mat4.create();
    mat4.mul(modelViewMatrix, viewMatrix, modelMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    {
        const vertexCount = circuitosBuffer.index.numItems;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.lineWidth(10);
        gl.drawElements(gl.LINES, vertexCount, type, offset);
    }
    
}

function funTimer(deltaTime){
    
    if(calcularSensores){
        var sensorIzqX = desX + Math.sin(rotY*Math.PI/180.0) * (RS) + Math.cos(rotY*Math.PI/180.0) * (DS/2);
        var sensorIzqZ = desZ + Math.cos(rotY*Math.PI/180.0) * (RS) + Math.sin(rotY*Math.PI/180.0) * (-DS/2);
        var sensorDerX = desX + Math.sin(rotY*Math.PI/180.0) * (RS) + Math.cos(rotY*Math.PI/180.0) * (-DS/2);
        var sensorDerZ = desZ + Math.cos(rotY*Math.PI/180.0) * (RS) + Math.sin(rotY*Math.PI/180.0) * (DS/2);
        //console.log("Izq: X: " + sensorIzqX + ", Z: " + sensorIzqZ);
        //console.log("Der: X: " + sensorDerX + ", Z: " + sensorDerZ);
        const RAS = 1;
        var i = 0;
        while (i < circuito.length/3 && si == 1 && sd == 1){
            var point = circuitoPoints[i];
            var sensor = [sensorIzqX, 0 , sensorIzqZ, RAS, "izq"];
            var distance = Math.sqrt((point[0] - sensor[0]) * (point[0] - sensor[0]) +
                            (point[2] - sensor[2]) * (point[2] - sensor[2]));
            var pointBool =  distance < sensor[3];
            if(pointBool){
                si = 0;
                break;
            }
            sensor = [sensorDerX, 0, sensorDerZ, RAS, "der"];
            var distance = Math.sqrt((point[0] - sensor[0]) * (point[0] - sensor[0]) +
                            (point[2] - sensor[2]) * (point[2] - sensor[2]));
            pointBool =  distance < sensor[3];
            if(pointBool){
                sd = 0;
                break;
            }
            i++;
        };
    }
    
    var W = V/(RR/100.0); // Velocidad angular de las ruedas
    desX += (sd + si)*W*RR/2.0*DT*Math.sin(rotY*Math.PI/180.0);
    desZ += (sd + si)*W*RR/2.0*DT*Math.cos(rotY*Math.PI/180.0);
    rotY += (sd - si)*W*RR/DR*DT*180.0/Math.PI;
    rotCamera = (rotY * Math.PI/180.0) + AC;
    
    camX = (Math.cos(rotCamera*Math.PI/180) * RC) + desX;
    camZ = (Math.sin(rotCamera*Math.PI/180) * RC) + desZ;
       
 // Restauramos el estado de los sensores
    si = 1.0;
    sd = 1.0;
    
 // Para el efecto de los radios de las ruedas girando
    rotX -= 2.0;
    setTimeout(function (){}, milisegundos*0.001*deltaTime);
}

function isPointInSensor(point, sensor){
    var distance = Math.sqrt((point[0] - sensor[0]) * (point[0] - sensor[0]) +
                            (point[2] - sensor[2]) * (point[2] - sensor[2]));
    return distance < sensor[3];
}

function startCircuit(){
    desX = circuito[0];
    desZ = circuito[2];
    rotY = 0;
    calcularSensores = true;
}

function scroll(e){
    fofView += e.deltaY/75;
}

function handleKeyDown(event) {
    currentlyPressedKeys[event.keyCode] = true;

    switch (String.fromCharCode(event.keyCode)) {
        case 'D': 
            sd = 0;
            break;
        case 'A':
            si = 0;
            break;
        case 'W':
            V += 0.1;
            break;
        case 'S':
            V -= 0.1;
            break;
    }
}

function handleKeyUp(event) {
    currentlyPressedKeys[event.keyCode] = false;
}