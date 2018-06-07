var gl; // Un variable global para el contexto WebGL
var programInfo;

 // Para cambiar entre orthographic y perspective
var ortho = false;
var mvMatrixStack = [];
var modelMatrix = mat4.create();
var projectionMatrix = mat4.create();
var viewMatrix = mat4.create();
var normalMatrix = mat4.create();
var currentlyPressedKeys = {};
var circuito = [];
var circuitoPoints = [];
var circuitoIndex = [];
var circuitoColor = [];
var circuitoNormal = [];
var circuitoBool = false;
var calcularSensores = false;
var fofView = 90;
var newX = 0;
var newY = 0;
var width = 0;
var height = 0;
var mouseDown = false;
var camera = 1;
var minimoCircuito = null;
var maximoCircuito = null;
var center = null;
var numeroToques = 0;
var vueltas = 0;
var startTime;
var justLap = false;
var diff;

//Entradas html
var toques;
var vueltasHtml;
var anchoHtml;
var largoHtml;
var DRHtml;
var DSHtml;
var RSHtml;
var RRHtml;
var VHtml;

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
var rotXD = 0.0, rotXI = 0.0, rotY = 0.0; // Orientación
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

    toques = document.getElementById("toques");
    vueltasHtml = document.getElementById("vueltas");
    anchoHtml = document.getElementById("ancho");
    largoHtml = document.getElementById("largo");
    DRHtml = document.getElementById("DR");
    DSHtml = document.getElementById("DS");
    RSHtml = document.getElementById("RS");
    RRHtml = document.getElementById("RR");
    VHtml = document.getElementById("V");
    anchoHtml.value = ANCHO;
    largoHtml.value = LARGO;
    DRHtml.value = DR;
    DSHtml.value = DS;
    RSHtml.value = RS;
    RRHtml.value = RR;
    VHtml.value = V;

    var canvas = document.getElementById("glcanvas");
    
    gl = initWebGL(canvas);      // Inicializar el contexto GL

    // Solo continuar si WebGL esta disponible y trabajando

    if (gl) {
        // Vertex shader program

        const vsSource = `
        attribute vec3 aVertexPosition;
        attribute vec3 aVertexNormal;

        uniform mat4 uModelViewMatrix; 
        uniform mat4 uProjectionMatrix; 
        uniform mat4 uNormalMatrix; 

        varying vec3 vNormal;
        varying vec3 vEyeVec;

        void main(void) {
             //Transformed vertex position
             vec4 vertex = uModelViewMatrix * vec4(aVertexPosition, 1.0);

             //Transformed normal position
             vNormal = vec3(uNormalMatrix * vec4(aVertexNormal, 1.0));

             //Vector Eye
             vEyeVec = -vec3(vertex.xyz);

             //Final vertex position
             gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
        }
`;
        const fsSource = `
        #ifdef GL_ES
        precision highp float;
        #endif

        uniform float uShininess;        //shininess
        uniform vec3 uLightDirection;  //light direction

        uniform vec4 uLightAmbient;      //light ambient property
        uniform vec4 uLightDiffuse;      //light diffuse property 
        uniform vec4 uLightSpecular;     //light specular property

        uniform vec4 uMaterialAmbient;  //object ambient property
        uniform vec4 uMaterialDiffuse;   //object diffuse property
        uniform vec4 uMaterialSpecular;  //object specular property

        varying vec3 vNormal;
        varying vec3 vEyeVec;

        void main(void)
        {
             vec3 L = normalize(uLightDirection);
             vec3 N = normalize(vNormal);

             //Lambert's cosine law
             float lambertTerm = dot(N,-L);

             //Ambient Term
             vec4 Ia = uLightAmbient * uMaterialAmbient;

             //Diffuse Term
             vec4 Id = vec4(0.0,0.0,0.0,1.0);

             //Specular Term
             vec4 Is = vec4(0.0,0.0,0.0,1.0);

             if(lambertTerm > 0.0) //only if lambertTerm is positive
             {
                  Id = uLightDiffuse * uMaterialDiffuse * lambertTerm; //add diffuse term

                  vec3 E = normalize(vEyeVec);
                  vec3 R = reflect(L, N);
                  float specular = pow( max(dot(R, E), 0.0), uShininess);

                  Is = uLightSpecular * uMaterialSpecular * specular; //add specular term 
             }

             //Final color
             vec4 finalColor = Ia + Id + Is;
             finalColor.a = 1.0;

             gl_FragColor = finalColor;
        }
`;
        
        canvas.addEventListener("wheel", scroll);
        canvas.onmousedown = handleMouseDown;
        document.onmouseup = handleMouseUp;
        canvas.onmousemove = handleMouseMove;
        
        width = canvas.width;
        height = canvas.height;
        
        const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
        programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
                uMaterialAmbient: gl.getUniformLocation(shaderProgram, 'uMaterialAmbient'),
                uMaterialDiffuse: gl.getUniformLocation(shaderProgram, 'uMaterialDiffuse'),
                uMaterialSpecular: gl.getUniformLocation(shaderProgram, 'uMaterialSpecular'),
                uShininess: gl.getUniformLocation(shaderProgram, 'uShininess'),
                uLightAmbient: gl.getUniformLocation(shaderProgram, 'uLightAmbient'),
                uLightDiffuse: gl.getUniformLocation(shaderProgram, 'uLightDiffuse'),
                uLightSpecular: gl.getUniformLocation(shaderProgram, 'uLightSpecular'),
                uLightDirection: gl.getUniformLocation(shaderProgram, 'uLightDirection'),
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
                    var x = parseFloat(nums[0]);
                    var y = 0;
                    var z = parseFloat(nums[1]);
                    if(minimoCircuito == null){
                        minimoCircuito = [x, y, z];
                    } else {
                        if(minimoCircuito[0] > x)
                            minimoCircuito[0] = x;
                        if(minimoCircuito[2] > z)
                            minimoCircuito[2] = z;
                    }
                    
                    if(maximoCircuito == null){
                        maximoCircuito = [x, y, z];
                    } else {
                        if(maximoCircuito[0] < x)
                            maximoCircuito[0] = x;
                        if(maximoCircuito[2] < z)
                            maximoCircuito[2] = z;
                    }
                    
                    circuito.push(x);
                    circuito.push(y);
                    circuito.push(z);
                    circuitoPoints.push([x, y, z]);
                    circuitoIndex.push((i%allLines.length));
                    circuitoIndex.push(((i+1)%allLines.length));
                    circuitoNormal.push(0.0, 1.0, 0.0);
                    circuitoColor.push([1.0, 1.0, 1.0, 1.0]);
                    circuitoColor.push([1.0, 1.0, 1.0, 1.0]);
                    circuitoColor.push([1.0, 1.0, 1.0, 1.0]);
                    circuitoColor.push([1.0, 1.0, 1.0, 1.0]);
                    i++;
                });
                center = [(minimoCircuito[0] + maximoCircuito[0])/2, 0, (minimoCircuito[2] + maximoCircuito[2])/2];
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
        
        setInterval(function(){
            funTimer()
        }, 1000/72);

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

function initLights(gl){
    gl.uniform3f(programInfo.uniformLocations.uLightDirection,   0.0, -1.0, -1.0);
    gl.uniform4fv(programInfo.uniformLocations.uLightAmbient, [0.03,0.03,0.03,1.0]);
    gl.uniform4fv(programInfo.uniformLocations.uLightDiffuse,  [1.0,1.0,1.0,1.0]); 
    gl.uniform4fv(programInfo.uniformLocations.uLightSpecular,  [1.0,1.0,1.0,1.0]);
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
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circuitoNormal), gl.STATIC_DRAW);
    var boton = document.getElementById('botonCircuito');
    boton.style.display = "inline-block";
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
    
    const circuitoNormalBuffer = gl.createBuffer();
    
    var material = [
        [0.5, 0.5, 0.5, 1.0],  //Material ambient
        [1.0, 1.0, 1.0, 1.0],  //Material diffuse
        [0.4, 0.4, 0.4, 1.0],     //Material specular
        50.0                      //Shininess
    ];
    
    return {
        vertex: circuitoVertexBuffer,
        index: circuitoIndexBuffer,
        color: circuitoColorBuffer,
        normal: circuitoNormalBuffer,
        material: material
    }
}

function cubeBuffers(gl){
    
    const cubeVertex = [
        -1, -1, -1, //0
        -1, -1,  1, //1
        -1,  1, -1, //2
        -1,  1,  1, //3
         1, -1, -1, //4
         1, -1,  1, //5
         1,  1, -1, //6
         1,  1,  1, //7
    ];
    
    const cubeIndex = [
        3, 1, 5,  3, 5, 7, //Front face
        7, 5, 4,  7, 4, 6, //Right face
        2, 3, 7,  2, 7, 6, //Top face
        2, 0, 1,  2, 1, 3, //Left face
        1, 0, 4,  1, 4, 5, //Bottom face
        6, 4, 0,  6, 0, 2, //Back face
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
    
    const cubeNormal = [
        -1, -1, -1, //0
        -1, -1,  1, //1
        -1,  1, -1, //2
        -1,  1,  1, //3
         1, -1, -1, //4
         1, -1,  1, //5
         1,  1, -1, //6
         1,  1,  1, //7
    ]
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
    //Buffer de normales
    const cubeNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeNormal), gl.STATIC_DRAW);
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
    
    var materialWhite = [
        [0.02, 0.02, 0.02, 1.0],  //Material ambient
        [1.0, 1.0, 1.0, 1.0],  //Material diffuse
        [0.4, 0.4, 0.4, 1.0],     //Material specular
        50.0                      //Shininess
    ];
    
    var materialRed = [
        [0.02, 0.02, 0.02, 1.0],  //Material ambient
        [1.0, 0.02, 0.01, 1.0],  //Material diffuse
        [0.4, 0.4, 0.4, 1.0],     //Material specular
        50.0                      //Shininess
    ];
    
    var materialGrey = [
        [0.20, 0.20, 0.20, 1.0],  //Material ambient
        [0.30, 0.30, 0.30, 1.0],  //Material diffuse
        [0.10, 0.10, 0.10, 1.0],     //Material specular
        50.0                      //Shininess
    ];
    
    var materialBlack = [
        [0.02, 0.02, 0.02, 1.0],  //Material ambient
        [0.1, 0.1, 0.1, 1.0],  //Material diffuse
        [0.4, 0.4, 0.4, 1.0],     //Material specular
        50.0                      //Shininess
    ];
    
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
        normal: cubeNormalBuffer,
        color: cubeColorBuffer,
        colorRed: cubeColorRedBuffer,
        colorGrey: cubeColorGreyBuffer,
        colorBlack: cubeColorBlackBuffer,
        materialWhite: materialWhite,
        materialRed: materialRed,
        materialGrey: materialGrey,
        materialBlack: materialBlack
    }
}

function cylinderBuffers(gl){
    var height = (RR-0.5);
    var sides = 30;
    var radius = 0.2;
    const a = 0, c = 0;
    const color = [1.0, 1.0, 0.0, 1.0];
    const theta = (Math.PI / 180) * (360/sides);
    var num = 0;
    var vertexPositionData = [];
    var indexData = [];
    var colorData = [];
    var normalData = [];
    
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
        calculateNormal(vertexPositionData[num], vertexPositionData[num + 1], vertexPositionData[num + 2], normalData)
        indexData.push(num + 4, num + 1, num + 2);
        calculateNormal(vertexPositionData[num + 4], vertexPositionData[num + 1], vertexPositionData[num + 2], normalData)
        indexData.push(num + 4, num + 2, num + 5);
        calculateNormal(vertexPositionData[num + 4], vertexPositionData[num + 2], vertexPositionData[num + 5], normalData)
        indexData.push(num + 3, num + 4, num + 5);
        calculateNormal(vertexPositionData[num + 3], vertexPositionData[num + 4], vertexPositionData[num + 5], normalData)
        
        for (j = 0; j < 32; j++){
             colorData.push(color);
        }
        num += 6;
    }
    
    
    var material = [
        [0.02, 0.02, 0.02, 1.0],  //Material ambient
        [1.0, 0.85, 0.01, 1.0],  //Material diffuse
        [0.4, 0.4, 0.4, 1.0],     //Material specular
        50.0                      //Shininess
    ];
    
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    indexBuffer.itemSize = 16;
    indexBuffer.numItems = indexData.length;
    
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    
    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);
    
    return {
        vertex: vertexBuffer,
        index: indexBuffer,
        color: colorBuffer,
        normal: normalBuffer,
        material: material
    }
}

function sphereBuffers(gl){
    var latitudeBands = 25;
    var longitudeBands = 25;
    var radius = 1;
    var vertexPositionData = [];
    var indexData = [];
    var normalData = [];
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
            normalData.push(x, y, z);
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
    
    var materialBlue = [
        [0.02, 0.02, 0.02, 1.0],  //Material ambient
        [0.01, 0.46, 0.84, 1.0],  //Material diffuse
        [0.4, 0.4, 0.4, 1.0],     //Material specular
        10.0                      //Shininess
    ];
    
    var materialGreen = [
        [0.02, 0.3, 0.02, 1.0],  //Material ambient
        [0.01, 0.84, 0.10, 1.0],  //Material diffuse
        [0.4, 0.4, 0.4, 1.0],     //Material specular
        10.0                      //Shininess
    ];
    
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
    
    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    
    var colorGreenBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorGreenBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorsGreen), gl.STATIC_DRAW);
    
    return {
        vertex: vertexBuffer,
        index: indexBuffer,
        normal: normalBuffer,
        color: colorBuffer,
        colorGreen: colorGreenBuffer,
        materialBlue: materialBlue,
        materialGreen: materialGreen
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
    if(camera == 2){
        const left = -fofView, right = fofView, bottom = -fofView*0.75, top = fofView*0.75, nplane = 1, fplane = 1000;
        mat4.ortho(projectionMatrix, left, right, bottom, top, nplane, fplane);
        
        var eye;
        var thisCenter;
        if(!circuitoBool){
            eye    = [desX , fofView, desZ];
            thisCenter = [desX,  0.0,  desZ];
        } else {
            eye = [center[0], fofView, center[2]];
            thisCenter = center;
        }
        const up     = [0.0, 0.0, 1.0];

        mat4.lookAt(viewMatrix, eye, thisCenter, up);
    } else if (camera == 1) {
        mat4.perspective(projectionMatrix,
                         fieldOfView,
                         aspect,
                         zNear,
                         zFar);
        
        const eye    = [ (RC*Math.cos(newY*Math.PI/180.0)*Math.sin(newX*Math.PI/180.0)) + desX,
                              RC*Math.sin(newY*Math.PI/180.0),
                              (RC*Math.cos(newY*Math.PI/180.0)*Math.cos(newX*Math.PI/180.0)) + desZ];
        //const eye    = [camX, 75.0,  camZ];
        //const eye    = [0.0, 50.0,  0.0];
        const center = [desX,  0.0,  desZ];
        const up     = [0.0, 1.0, 0.0];


        mat4.lookAt(viewMatrix, eye, center, up);
    } else {
        mat4.perspective(projectionMatrix,
                         fieldOfView,
                         aspect,
                         zNear,
                         zFar);

        
        if(center == null || !circuitoBool){    
            center = [desX,  0.0,  desZ];
        }
        const eye    = [ (RC*Math.cos(newY*Math.PI/180.0)*Math.sin(newX*Math.PI/180.0)) + center[0],
                              RC*Math.sin(newY*Math.PI/180.0) + 50.0,
                              (RC*Math.cos(newY*Math.PI/180.0)*Math.cos(newX*Math.PI/180.0)) + center[2]];
        //const eye = [center[0], 75.0,  center[2]];
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
    
    
    
}

function drawCuerpo(buffers){
    mvPushMatrix();
        mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -(LARGO - RS)]);
        mat4.scale(modelMatrix, modelMatrix, [ANCHO, 1.0, LARGO]);
        //drawModelWired(buffers.cube, buffers.cube.colorBlack);
        drawModel(buffers.cube, buffers.cube.materialWhite);
    mvPopMatrix();
}

function drawRuedasDelanteras(buffers){
    const distRueda = DR + 1.0;
    mvPushMatrix();
        mat4.translate(modelMatrix, modelMatrix, [-distRueda, 0.0, 0.0]);
        drawRuedaDelantera(buffers, "izq");
        mat4.translate(modelMatrix, modelMatrix, [2*distRueda, 0.0, 0.0]);
        drawRuedaDelantera(buffers, "dcha");
    mvPopMatrix();
}

function drawRuedaDelantera(buffers, side){
    mvPushMatrix();
        if(side == "izq")
            mat4.rotate(modelMatrix, modelMatrix,- rotXI * Math.PI /180, [1.0, 0.0, 0.0]);
        else
            mat4.rotate(modelMatrix, modelMatrix,- rotXD * Math.PI /180, [1.0, 0.0, 0.0]);
        mat4.rotate(modelMatrix, modelMatrix, 90 * Math.PI /180, [0.0, 0.0, 1.0]);
        mat4.scale(modelMatrix, modelMatrix, [RR,RR/2, RR]);
        drawModel(buffers.sphere, buffers.sphere.materialGreen);
        drawModelWired(buffers.sphere, buffers.sphere.materialBlue);
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
    //drawModel(buffers.cylinder, buffers.cylinder.material);
    //drawModelWired(buffers.cube, buffers.cube.colorBlack);
    drawModel(buffers.cube, buffers.cube.materialRed);
}

function drawBase(buffers){
    mvPushMatrix();
        mat4.translate(modelMatrix, modelMatrix, [0.0, -5.0, 0.0]);
        mat4.scale(modelMatrix, modelMatrix, [500.0, 1.0, 500.0]);
        drawModel(buffers.cube, buffers.cube.materialGrey);
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

function drawModel(cube, material){
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
    
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, cube.normal);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexNormal,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexNormal);
    }
    
    gl.useProgram(programInfo.program);
    const modelViewMatrix = mat4.create();
    mat4.mul(modelViewMatrix, viewMatrix, modelMatrix);
    
    mat4.copy(normalMatrix, modelViewMatrix);
    mat4.invert(normalMatrix, normalMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, 
        false, 
        normalMatrix);
    
    gl.uniform4fv(programInfo.uniformLocations.uMaterialAmbient, material[0]); 
    gl.uniform4fv(programInfo.uniformLocations.uMaterialDiffuse, material[1]);
    gl.uniform4fv(programInfo.uniformLocations.uMaterialSpecular,material[2]);
    gl.uniform1f(programInfo.uniformLocations.uShininess, material[3]);
    initLights(gl);
    
    {
        const vertexCount = cube.index.numItems;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
    
}

function drawModelWired(cube, material){
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

    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, cube.normal);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexNormal,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexNormal);
    }
    
    
    gl.useProgram(programInfo.program);
    const modelViewMatrix = mat4.create();
    mat4.mul(modelViewMatrix, viewMatrix, modelMatrix);
    
    mat4.copy(normalMatrix, modelViewMatrix);
    mat4.invert(normalMatrix, normalMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, 
        false, 
        normalMatrix);
    
    gl.uniform4fv(programInfo.uniformLocations.uMaterialAmbient, material[0]); 
    gl.uniform4fv(programInfo.uniformLocations.uMaterialDiffuse, material[1]);
    gl.uniform4fv(programInfo.uniformLocations.uMaterialSpecular,material[2]);
    gl.uniform1f(programInfo.uniformLocations.uShininess, material[3]);
    initLights(gl);
    
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
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, circuitosBuffer.normal);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexNormal,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexNormal);
    }
    
    gl.useProgram(programInfo.program);
    const modelViewMatrix = mat4.create();
    mat4.mul(modelViewMatrix, viewMatrix, modelMatrix);
    
    mat4.copy(normalMatrix, modelViewMatrix);
    mat4.invert(normalMatrix, normalMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, 
        false, 
        normalMatrix);
    
    gl.uniform4fv(programInfo.uniformLocations.uMaterialAmbient, circuitosBuffer.material[0]); 
    gl.uniform4fv(programInfo.uniformLocations.uMaterialDiffuse, circuitosBuffer.material[1]);
    gl.uniform4fv(programInfo.uniformLocations.uMaterialSpecular,circuitosBuffer.material[2]);
    gl.uniform1f(programInfo.uniformLocations.uShininess, circuitosBuffer.material[3]);
    initLights(gl);
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
        comprobarVuelta((sensorIzqX + sensorDerX) / 2, (sensorIzqZ + sensorDerZ) / 2);
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
                addToque();
                rotXI += V * 10;
                break;
            }
            sensor = [sensorDerX, 0, sensorDerZ, RAS, "der"];
            var distance = Math.sqrt((point[0] - sensor[0]) * (point[0] - sensor[0]) +
                            (point[2] - sensor[2]) * (point[2] - sensor[2]));
            pointBool =  distance < sensor[3];
            if(pointBool){
                sd = 0;
                addToque();
                rotXD += V * 10;
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
    rotXD -= V * 10;
    rotXI -= V * 10;
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
    justLap = true;
    setTimeout(function(){
        justLap = false;
    }, 1500);
    calcularSensores = true;
    startTime = new Date();
    var x = setInterval(function(){
        var end = new Date();
        var temp = end.getTime() - startTime.getTime();
        diff = new Date(temp);
        var sec = diff.getSeconds();
        var min = diff.getMinutes();
        var hr = diff.getHours() - 1;
        if (min < 10){
            min = "0" + min
        }
        if (sec < 10){
            sec = "0" + sec
        }
        document.getElementById("chronometer").textContent = hr + ":" + min + ":" + sec;
    }, 1000);
}

function scroll(e){
    fofView += e.deltaY/75;
    if(fofView > 160){
        fofView = 160;
    } else if(fofView < 10){
        fofView = 10;
    }
}

function handleMouseDown(event){
    mouseDown = true;
    old_x = event.clientX;
    old_y = event.clientY;
}

function handleMouseUp(){
    mouseDown = false;
}

function handleMouseMove(event){
    if(mouseDown) {  
        newX += (old_x - event.clientX);
        old_x = event.clientX;
        newY += (event.clientY - old_y);
        if(newY < 0){
            newY = 0;
        } else if (newY > 89){
            newY = 89;
        }
        old_y = event.clientY;
    }
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
            VHtml.value = parseFloat(V);
            break;
        case 'S':
            V -= 0.1;
            VHtml.value = parseFloat(V);
            break;
    }
}

function handleKeyUp(event) {
    currentlyPressedKeys[event.keyCode] = false;
}

//Funcion para calcular las normales de tres vertices
function calculateNormal (v1, v2, v3, normalData) {

  var subtract = function (a, b) {

    var vec3 = new Array(3);

    vec3[0] = a[0] - b[0],
    vec3[1] = a[1] - b[1],
    vec3[2] = a[2] - b[2];

    return vec3;

  }


  var crossProduct = function (a, b) {

    var vec3 = new Array(3);

    vec3[0] = a[1] * b[2] - a[2] * b[1];
    vec3[1] = a[2] * b[0] - a[0] * b[2];
    vec3[2] = a[0] * b[1] - a[1] * b[0];

    return vec3;

  }


  var normalize = function (a) {

    var vec3 = new Array(3);

    var len = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
      
    if (len > 0) {

      len = 1 / Math.sqrt(len);

      vec3[0] = len * a[0];
      vec3[1] = len * a[1];
      vec3[2] = len * a[2];

    }

    return vec3;

  }

    var p12 = subtract(v2, v1),
        p23 = subtract(v3, v2);
    var cp = crossProduct(p12, p23);

    var normal = normalize(cp);

    normalData.push( normal[0], normal[1], normal[2] );

}

function comprobarVuelta(x, z){
    if(circuitoBool) {
        if (isPointInSensor(circuitoPoints[0], [x, 0, z, DS]) && !justLap) {
            //Se ha completado una vuelta, ponemos valor boolean a true durante un tiempo (para no repetir la misma vuelta)
            //Y sumamos un punto a las vueltas, cogiendo el tiempo y reseteando el cronometro.
            justLap = true;
            setTimeout(function(){
                justLap = false;
            }, 1500);
            var e = document.createElement("li");
            var sec, min, hr;
            if(diff != null){
                sec = diff.getSeconds();
                min = diff.getMinutes();
                hr = diff.getHours() - 1;
            } else {
                sec = "00";
                min = "00";
                hr = "00";
            }
            if (min < 10){
                min = "0" + min
            }
            if (sec < 10){
                sec = "0" + sec
            }
            vueltas++;
            var p = document.createElement("span");
            p.textContent = " Tiempo: " + hr + ":" + min + ":" + sec + " - Toques: " + numeroToques;
            e.append(p);
            numeroToques = 0;
            e.className = "list-group-item";
            vueltasHtml.appendChild(e);
            startTime = new Date();
        }
    }
}

function addToque() {
    numeroToques++;
    toques.textContent = numeroToques;
}

function saveValues() {
    ANCHO = parseInt(anchoHtml.value);
    LARGO = parseInt(largoHtml.value);
    DR = parseInt(DRHtml.value);
    DS = parseInt(DSHtml.value);
    RS = parseInt(RSHtml.value);
    RR = parseInt(RRHtml.value);
    V = parseFloat(VHtml.value);
}