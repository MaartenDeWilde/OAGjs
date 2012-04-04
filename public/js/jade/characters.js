$(document).ready(function(){
    jQuery.get('/characters',function(characters){
        $("#list").empty();
        if(characters){
            for(var char in characters){
                var currentChar = characters[char];
                $("#list").append("<li>" + currentChar.name +  " : " + currentChar.class +" <br/><a href='#' char='" +  currentChar.name +"'>Select</a></li>");
            }
            $("#list li a").click(function(){
                    var char = $(this).attr('char');
                    jQuery.get("/characters/select/" + char,function(){
                        window.location.href ="/lobby";
                    });
                }
            );
        }

    });
});