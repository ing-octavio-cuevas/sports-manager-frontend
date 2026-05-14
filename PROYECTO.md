# Descripción del Proyecto

Herramienta para gestion de torneos de voleibol

## ¿Qué quiero construir?
Vamos a crear una plataforma responsive que sera una herramienta para la gestion de un torneo de voleibol que servira para el anfitrion, arbitros y jugadores



## Funcionalidades principales

Rol Anfitrion:

    CRUD para crear torneos:
    Visualizacion de torneos
    Visualizacion de jornadas
    Visualizacion de equipos
    
        
    CRUD para crear jornadas
    Visualizacion de resultados
    Tablas de posiciones
    Arbitrajes pagados
    Asistencias de jugadores por partido

    CRUD para crear equipos
    Visualizacion de integrantes
    Asignacion de capitan

Rol Arbitro
    Visualizacion de torneos
    Visualizacion de jornadas
    Visualizacion de equipos y jugadores
    Tablas de posiciones
    Arbitrajes pagados
    Registro de Asistencias de jugadores por partido

Rol jugador
    Visualizacion de torneos
    Visualizacion de jornadas
    Visualizacion de equipos y jugadores
    Tablas de posiciones
    Arbitrajes pagados
    Asistencias de jugadores por partido

- Creacion de torneo:
    El torneo consiste en CRUD informacion basica como nombre del torneo, duracion, reglamento y unidad de juego que sera un catalogo configurable, canchas disponibles, las canchas tendran asociada una direccion que puede ser una pre visualizacion en google maps, costo de inscripcion y costo de arbitraje. La unidad de juego se refiere a una palabra que esta relacionada a las fases que durara el torneo, por ejemplo, jornadas. El torneo puede tener un logo

    tEndremos crud de Un torneo, tiene equipos relacionados, un equipo tiene nombre, el estatus en caso de estar activo o dado de baja, si ya pago inscripcion, cantidad de jugadores, arbitros, ubicacion, duracion, canchas disponibles
    
     tendremos crud deUn equipo, tiene jugadores, el jugador se identifica con campos basicos como nombre completo, edad, estatus y fotografia. El equipo puede tener un logo asignado

    Para un torneo,segun la  unidad de juego configurada hay un  rol de partidos, cada partido tiene como datos el nombre del equipo 1 y nombre del equipo 2, cancha donde se jugara y horario, arbitro asignado, cada partido debe pagarse arbitraje por cada equipo entonces debemos visualizar si fue pagado por ambos equipos, toda esta informacion debera poderse hacer mediante crud. Un partido puede ser configurado a N numero de sets por jugar

    Debemos tener un modulo donde se registren los resultados de los partidos de cada set, el pago de arbitrajes.






- 
- 
#### Criterios de Aceptación

1. WHEN una operación de la API se completa exitosamente, THE Notificación SHALL mostrar un snackbar con un mensaje de éxito durante al menos 3 segundos.
2. IF una operación de la API falla, THEN THE Notificación SHALL mostrar un snackbar con un mensaje de error durante al menos 5 segundos.
3. THE Notificación SHALL diferenciarse visualmente entre mensajes de éxito (color verde) y mensajes de error (color rojo).

1. WHILE el Servicio_API está procesando una petición HTTP, THE Loader SHALL mostrarse visible en el Portal.
2. WHEN el Servicio_API completa la petición HTTP (éxito o error), THE Loader SHALL ocultarse.

## Estilo / Diseño (opcional)

Debe ser creado con un estilo elegante, interfaz amigable con el usuario y responsive, los componentes seran creados con css


## Notas adicionales (opcional)


Debera ser creado en react 17
Todos los servicios o funcionalidades seran diseñadas esperando recibir la informacion mediante consultas a endpoints con API Rest
 separar la lógica de cada módulo en componentes independientes y reutilizables.
 incluir comentarios descriptivos en el código fuente.
 Por ahora pon un endpoint ejemplo para todos los endpoints necesarios