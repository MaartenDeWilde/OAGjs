/**
 * Created by JetBrains WebStorm.
 * User: Maarten De Wilde
 * Date: 7/03/12
 * Time: 21:51
 */
requirejs.config({
                     //By default load any module IDs from js/lib
                     baseUrl:'lib',
                     paths:{
                         js:'../js',
                         socketIo:'/socket.io/socket.io'
                     }
                 });
//GAME.framerate = 50;
requirejs(["js/settings", "js/animationsFactory", "js/collisionDetection", "js/player", "js/arena",  "js/hud", "js/framework/preload", "jquery","hammer","jsgamesoup","socketIo"],
          function (settings, animationFactory, collisionDetectorClass, playerClass, arenaUi, hudClass, imgPreload, jQuery) {
              //    if (window.isMobile) {
              //        GAME.framerate = 10;
              //    }

              var that = this;

              var collisionDetector = new collisionDetectorClass();
              var imagesToPreload = [];
              imagesToPreload.push("/img/knight/tileSet.png");
              var currentCharId;
              var allOtherChars = {};
              var player;

              var getArena = function () {
                  return that.arenaGetter;
              };

              var updateCharacters = function (newPos) {
                  if (newPos.charId !== currentCharId) {
                      var foundChar = allOtherChars[newPos.charId];
                      if (foundChar) {
                          foundChar.setDirectionForNPC(newPos.x, newPos.y, newPos.direction, newPos.movementState,
                                                       newPos.dateTime)
                      } else {
                          var newPlayer = new playerClass(gs, false, newPos, getArena).character;
                          allOtherChars[newPos.charId] = newPlayer;
                          gs.addEntity(newPlayer);
                          collisionDetector.addCollisionItem(newPlayer);
                      }
                  }
              };

              var triggerAttach = function (attackingCharId, hurtedCharsStatus) {
                  var foundChar = allOtherChars[attackingCharId];
                  if (foundChar) {
                      foundChar.triggerAttack();
                  }
                  if (hurtedCharsStatus.length > 0) {
                      for (var huntedChar in hurtedCharsStatus) {
                          var hurtedCharStatus = hurtedCharsStatus[huntedChar];

                          var foundHurtedChar = allOtherChars[hurtedCharStatus.charId];
                          if (foundHurtedChar) {
                              foundHurtedChar.triggerHit(hurtedCharStatus.HP)
                          } else {
                              if (hurtedCharStatus.charId === currentCharId) {
                                  player.triggerHit(hurtedCharStatus.HP)
                              }
                          }
                      }
                  }
              };

              var onPositionChanged = function (data) {
                  socket.emit('updatePosition', data);
              };

              var performAttack = function (data) {
                  socket.emit('performAttack', data);
              };
              var gs = new JSGameSoup("surface", settings.framerate);
              var socket = io.connect();
              socket.on('connect');

              imgPreload(imagesToPreload, function () {
                  jQuery.get('/games/current', function (game) {
                      jQuery.get('/arenas/' + game.arena + '.json', function (arena) {
                          jQuery.get('/characters/current', function (currentPlayerInfo) {

                              var hammer = new Hammer(document.getElementById("surface").children[0]);

                              currentCharId = currentPlayerInfo.character._id;
                              player = new playerClass(gs, true, currentPlayerInfo.character.position, getArena, hammer).character;
                              player.onPositionChanged = onPositionChanged;
                              player.performAttack = performAttack;
                              collisionDetector.addCollisionItem(player);

                              gs.addEntity(player);

                              socket.on('updatedPosition', function (data) {
                                  updateCharacters(data);
                              });
                              socket.on('attackPerformed', function (data) {
                                  triggerAttach(data.attackingChar, data.hurtedChars);
                              });

                              that.arenaGetter = new arenaUi(arena.imagePath);
                              collisionDetector.addCircles(arena.circleBoundingBoxes);
                              collisionDetector.addRectangles(arena.rectangleBoundingBoxes);
                              that.arenaGetter.setCurrentPlayer(player);
                              gs.addEntity(that.arenaGetter);

                              var hud = new hudClass(gs);
                              gs.addEntity(hud);
                          });
                      })

                  });

              });

              gs.launch();
          });
