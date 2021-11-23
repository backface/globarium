<template>
  <router-view />
</template>

<style>
body, html {
  width: 100%;
  height: 100%;
  background-color: black;
  color: #eee;
  margin: 0px;
  padding: 0;
  overflow: hidden;
  font-family: 'TStar', 'Roboto', sans-serif;
}
a {color: #bbb}

#app {
  font-family: 'TStar', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #efefef;
  height: 100%;
}
.credits { text-align: left; position: absolute; left: 15px; bottom: 12px; font-size: 0.75em; opacity:0.7;}
.legend { text-align: right; position: absolute; right: 15px; bottom: 12px; font-size: 12px; opacity:0.7;}
.legend img { vertical-align: middle}
.copy { transform: rotate(-180deg); display: inline-block;}
.enterfs {
  text-align: center;
  position: absolute;
  bottom: 0px;
  width: 100%;
  margin: 0 auto
}
.enterfs a {
  font-size: 0.7em;
  text-decoration: none;
  cursor:pointer;
  opacity:0.7;
}

.btn {
  cursor: pointer
}
.btn:hover {
  opacity: 0.7
}

/* transitions */


.slide-fade-enter-active {
    transition: opacity 0.5s ease;
}

.slide-fade-enter {
    transition: opacity 0.5s ease;
}

.slide-fade-leave-active {
    transition: opacity 0.5s ease;
}

.slide-fade-leave-to, .slide-fade-enter-from
/* .slide-fade-leave-active below version 2.1.8 */ {
    opacity: 0;
}


</style>
