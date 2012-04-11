var common = require('./commonControllersResources.js');
var client = common.redisClient;
var async = require('async');

exports.updateSio = function(session, data,callback){
    if(session.selectedChar){
        var charId = session.selectedChar._id;

        var charName = "Char_"+charId;
        client.get(charName,function(err,gameId){
            var charStatus = "CharStatus_"+charId;
            client.hgetall(charStatus,function(err,status){
                var newPos = data;
                status.x = newPos.x;
                status.y = newPos.y;
                if(newPos.direction){
                    status.direction = newPos.direction;
                }
                status.dateTime = newPos.dateTime;
                status.movementState = newPos.movementState;
                client.hmset(charStatus,status);
                callback(true,status,gameId);
            })
        });
    }
    else{
        callback(false);
    }
};

exports.performAttack = function(session, data,callback){
    var attackHP = 20;
    var attackRange = 60;
    var attackAngle = 45;

    if(session.selectedChar){
        var currentCharId = session.selectedChar._id;

        var charName = "Char_"+currentCharId;
        client.get(charName,function(err,gameId){

            var charStatus = "CharStatus_"+currentCharId;
            client.hgetall(charStatus,function(err,currentCharPosition){
                var roomPlayers = "Game_"+gameId;
                client.SMEMBERS(roomPlayers,function(err,allCharsInGame){
                    var hitCharactersAndHowItAffectTheUi = [];
                    async.forEach(allCharsInGame,function (charId, foreachCallback) {
                        if(charId !== currentCharId){
                            var charStatus = "CharStatus_"+charId;
                            client.hgetall(charStatus,function(err,status){
                                if(charactersCollide(currentCharPosition,status,{range : attackRange, angle : attackAngle})) {
                                    status.HP = status.HP - attackHP;
                                    client.hmset(charStatus,status);

                                    //TODO : not send all status to the UI
                                    hitCharactersAndHowItAffectTheUi.push(status);
                                }
                            });
                        }
                        foreachCallback();
                    }, function(err){
                        if(err){
                            console.log(err);
                            res.send(500);
                        }
                        else{
                            callback(true,{attackingChar : currentCharId, hurtedChars : hitCharactersAndHowItAffectTheUi},gameId);
                        }
                    });
                });
            });


        });
        //TODO : log to stats
    }
    else{
        callback(false);
    }
};

var charactersCollide = function(currentChar, targetChar,attack){
    var attackRange = attack.range;
    var attackAngle = attack.angle;
    var direction = currentChar.direction;
    var rangeBetweenPlayers =computeDistanceBetweenTwoPoints(currentChar,targetChar);
    if(rangeBetweenPlayers <= attack.range){
        var newRotationAngle = getRotationAngleForDirection(direction);
        //var newTargetPoint = rotate(currentChar,targetChar);
        var targetPointAngle = pointAngleCompareToP1(currentChar,targetChar);
        console.log(targetPointAngle)
        var targetPointAngleWithNewRotationAngle = targetPointAngle - newRotationAngle+ (attackAngle/2);
        if(targetPointAngleWithNewRotationAngle >= 0 && targetPointAngleWithNewRotationAngle< attackAngle){
            console.log('CHAR IN RANGE AND ANGLE : '+targetPointAngleWithNewRotationAngle-(attackAngle/2));
            return true;
        }
    }
    return false;
};

var pointAngleCompareToP1 = function(p1,p2){
    return 180 / Math.PI * Math.atan2(p2.y - p1.y,p2.x - p1.x);
};

var computeDistanceBetweenTwoPoints = function(p1,p2){
    return Math.sqrt(Math.pow(p2.x - p1.x,2) + Math.pow(p2.y - p1.y,2))
};

var getRotationAngleForDirection = function(direction){
    if(direction === 'n')return 0;
    if(direction === 'ne')return 45;
    if(direction === 'e')return 90;
    if(direction === 'se')return 135;
    if(direction === 's')return 180;
    if(direction === 'sw')return 225;
    if(direction === 'w')return 270;
    if(direction === 'nw')return 315;
};