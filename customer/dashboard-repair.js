/* Targeted ROTA customer dashboard navigation repair.
   Preserve ride matching, reservations, authentication and map business logic. */
(function(){
  "use strict";
  function bind(){
    var reserve=document.getElementById("r33Reserve");
    var modal=document.getElementById("rotaReservationModal");
    if(reserve&&modal&&!reserve.dataset.rotaDirectReservation){
      reserve.dataset.rotaDirectReservation="1";
      reserve.addEventListener("click",function(event){
        event.preventDefault();
        event.stopImmediatePropagation();
        modal.classList.add("show");
        modal.style.display="";
        var pickup=document.getElementById("rrPickup");
        if(pickup)pickup.focus({preventScroll:true});
      },true);
    }
    var canvas=document.getElementById("r33MapCanvas");
    if(canvas&&!canvas.dataset.rotaMapReadyNotice){
      canvas.dataset.rotaMapReadyNotice="1";
      var note=document.getElementById("r33Note");
      if(note&&!window.L&&!(window.google&&google.maps)){
        note.textContent="Harita yüklenemedi. Sayfayı yenileyin.";
      }
    }
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",bind,{once:true});
  }else bind();
  var observer=new MutationObserver(bind);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("load",bind,{once:true});
})();