$( document ).ready(function() {
  $('.scheduleMessageToggle').click(function() {
    console.log('called')
    $('#scheduleMessageTimeInput').collapse('toggle');
    $('input[name=scheduleMessageTimeInput]').val('')
  });
});
