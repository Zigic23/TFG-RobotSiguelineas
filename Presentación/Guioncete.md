En este Trabajo se ha implementado una Aplicación Web donde se visualizará el movimiento de un robot móvil con direccionamiento diferencial. Este robot tratará de seguir un circuito introducido por el usuario y podremos recoger y probar distintas combinaciones de él.ç

MOTIVACION
El trabajo viene motivado por una herramienta que estaba hecha en matlab y nos permitía ver un vehículo simple siguiendo un circuito, pero la modificación del vehículo conllevaba a modificación de código. 
Esto nos lleva a buscar un entorno web que nos permita modificar el vehículo sin ningún problema, ademas de aprovechar la oportunidad y, mediante Javascript y WebGL, convertir la visualización en una tridimensional.

OBJETIVOS

El objetivo general es conseguir una visualización 3D del vehículo, para lo que se buscó WebGL para poder representarlo en un entorno Web y poder editarlo de manera simple con unos campos de texto.

Además de estos objetivos podenmos encontrar objetivos más especificos como la manipulación del vehículo con el teclado y ratón, la visualización de distintas maneras o el poder añadir un circuito y recoger datos sobre el comportamiento del vehículo.

ESTADO DEL ARTE

Actualmente podemos encontrar una gran variedad de robots programados con arduino, pero cuestan dinero y hay que programarlos. También hay aplicaciones que simulan y diseñan robots para cadenas de montaje industriales. El problema es que ninguna se adapta al diseño específico que estamos buscando.

METODOLOGÍA DE TRABAJO

Hemos utilizado la metodología ágil para llevar un registro detallado de que hemos completado y que nos falta por hacer. Hemos utilizado trello, donde hemos ido apuntando las tareas pendientes y completadas.

Para el control de código se comenzó con dropbox para almacenarlo, pero no nos era suficiente ya que no tiene control de versiones, así que pasamos a utilizar Github.

MODELADO DEL SISTEMA

Pasamos a modelar el sistema que se va a utilizar en el robot, por lo que deberemos estudiar el funcionamiento y tipos de robots moviles.

ROBOTICA MÓVIL

Un robot es una máquina automática programable capaz de realizar determinadas operaciones de manera automática. Existen dos tipos, los robots manipuladores son básicamente brazos articulados con distintos tipos de articulaciones que les permiten realizar los movimientos necesarios. Los robots móviles son aquellos que se desplazan en el espacio, como por ejemplo robots de ruedas, con patas, submarinos o aéreos.

Para nosotros los mas importantes son los vehículos con ruedas.

VEHICULOS CON RUEDAS

Los vehículos con ruedas son la solución más simple y eficiente para conseguir la movilidad en terrenos suficientemente duros y libres de obstáculos.

Podemos encontrar tres tipos de configuraciones distintas: La configuración ackermann, en la que las ruedas delanteras son las que dan el giro, es la habitual en vehículos de cuatro ruedas convencionales.
Otra configuración es el triciclo, en el que la rueda delantera es la que se encarga de la dirección y la tracción.
Por último tenemos el direccionamiento diferencial, que es aquel en el que el giro viene dado por la diferencia de velocidades de las ruedas laterales. 

DIRECCIONAMIENTO DIFERENCIAL

Para poder simular la posición y rotación del robot en un momento dado necesitamos unir los modelos cinemático y discreto. Al unirlo obtenemos las siguientes ecuaciones, las cuales se actualizan a partirde las velocidades de las ruedas. RR es el radio de las ruedas, B distancia entre ruedas y delta es el paso de la simulación.

DIR DIF 2.

Las funciones anteriores las utilizaremos en la etapa del cauce gráfico de transformación, donde obtendremos las matrices de translación y rotación. Estas matrices son del modelo de OpenGL y se las aplicaremos a cada uyno de los puntos del robot para colocar el objeto en el sitio deseado en el momento de simularlo.
Además, modificaremos también proyecciones para los tipos de cámara, en esta etapa proyectaremos los puntos del espacio 3D en un plano 2D

NAVEGACIÓN AUTÓNOMA

Vamos a simular la navegación autónoma. El robot original iba sobre un circuito negro que estaba sobre blanco. Los sensores detectaban cambios de claridad y modifican la velocidad de la rueda, provocando que giren.

En nuestra aplicación tenemos todos los puntos del circuito y la ubicación de los sensores, por lo que podemos calcular la distancia de los puntos del circuito con los sensores con la formula mostrada.

ENTORNO TECNOLÓGICO

Para definir el entorno tecnológico hemos utilizado HTML, CSS y Javascript. Html es un lenguaje de programación que se utiliza para el desarrollo de páginas de Internet. En consonancia con HTML hemos dotado de estilos a la vista utilizando hojas de estilos en cascada, que es un lenguaje de diseño gráfico para estructurar y presentar el documento.
Para aportar toda la funcionalidad hemos utilizado javascript, que es un lenguaje de programación interpretado en el lado del cliente y que es soportado por todos los navegadores. Javascript nos ha permitido además acceder a los elementos HTML y a la api gráfica de WebGL.

WEBGL

WebGL es una api basada en OpenGL ES 2.0 que permite llevar a cabo la representación 2D y 3D en un elemento canvas HTML. Para representar se utiliza código Javascript donde se describirán tanto los objetos que representar como los cambios físicos que aplicamos sobre ellos. Además, para representar la iluminación utilizaremos código GLSL para la implementación de shaders.

IMPLEMENTACIÓN DE LA APLICACIÓN

Nos centraremos en el código Javascript, ya que es lo más importante de la aplicación. Comenzamos con una función inicializadora start() que se encarga de preparar todos los bufferse y todas las variables necesarias para la ejecución.

Tras esto se divide en dos partes:
El primer loop se encargará de actualizar los valores necesarios para la representación de la escena y calcular las colisiones con el circuito,
En el segundo loop se renderizará la escena, la cual renderizará el vehículo, el circuito cuando haya, y la plataforma sobre la que se encuentran.

Además se utilizó la librería Toji - gl matrix, que permite la manipulación de las matrices necesarias 

DESCRIPCION DE LA APLICACIÓN

Esta es una representación de nuestra aplicación. Podemos encontrar tres zonas importante Geometría del robot, Información y viewport.

INFORMACIÓN

En la zona inferior izquierda de la pantalla encontramos la información, donde viene el número de toques y el cronómetro. Estos comenzarán a contar cuando se haga click en el botón que veremos mas adelante de comenzar circuito.

Además las vueltas llevarán el número de toques y el tiempo realizado en cada vuelta.

ENTRADAS

En esta zona encontraremos los parámetros que nos permitirán modificar nuestro vehículo en tiempo real. También podremos añadir un archivo que contenga un circuito. Pulsando el botón Empezar circuito moveremos nuestro vehículo hasta el punto inicial del circuito e iniciaremos los contadores de tiempo y toques.

VIEWPORT

En esta zona encontramos la visualización del vehículo y los botones para los distintos tipos de cámaras.

PRUEBAS

Hemos realizado varias pruebas con el vehículo para ver su eficiencia en un circuito predefinido. La primera prueba será una prueba estándar sobre la que recoger unos valores base para poder comparar el resto de pruebas.
En la segunda prueba, al reducir la distancia entre ruedas obtuvimos un menor número de toques, pero unos tiempos parecidos.
En la tercera prueba al reducir la distancia entre sensores aumenta el número de toques en gran medida, ya que hace el circuito con mucha mas precision, aunque no modifica el tiempo.
En la cuarta prueba aumentamos la distancia rueda-sensor, provocando que el vehículo gire anticipandose a las curvas, reduciendo el número de toques y el tiempo por vuelta.
En la quinta prueba aumentamos la velocidad angular, provocando una disminución del tiempo y los toques en la mitad.
En la sexta prueba aumentamos el radio de las ruedas y pudimos observar que afecta de la misma manera que el aumento de la velocidad angular.

Para la séptima y última prueba intentamos obtener el mejor resultado poniendo una velocidad angular y radio de rueda fijos. Para cada una de las pruebas hemos realizado 5 vueltas y hemos obtenido la media de toques y tiempos.

De estos valores podemos apreciar cuales son los puntos fuertes si queremos reducir al máximo el tiempo. Además, realizando una combinación entre dos o tres características podemos hacer que se reduzca aún más. 

VIDEO

Explicación del vídeo.

CONCLUSIONES

En conclusión, esta aplicación nos permite ahorrar mucho tiempo y esfuerzo en obtener resultados bastante detallados sobre como podríamos construir nuestro robot físico.

Entre los objetivos, hemos conseguido una visualización 3D del vehículo utilizando Javascript y WebGL.
Además, hemos conseguido los objetivos específicos que son una manipulación del vehículo con teclado y ratón, la visualización con distintos tipos de proyección y cámara giratoria, y el poder añadir un circuito y recoger datos sobre las vueltas.

Sobre el trabajo futuro se ha pensado en realizar un editor avanzado en un popup que permita una edición detallada del vehículo con los cambios en tiempo real sobre él. También un generador de circuitos que permitiría dibujar un circuito y obtener el archivo de texto para insertar en la aplicación.

También podemos implementar una estela en el vehículo y se registrarían en las vueltas para poder compararlas entre ellas.

PREGUNTAS

Esto es todo, muchas gracias por vuestra atención, si tenéis alguna pregunta ahora es el momento (Por favor no).