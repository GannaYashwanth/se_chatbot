<script lang="ts">
    let todos = []
    let count = 0;

</script>

<div>you clicked the below button these many times : {count}</div>
<button on:click = {()=>{
    count++;
}}
 type="button" class="btn btn-info">Increment</button>

 <button on:click = {()=>{
    tsvscode.postMessage({type : 'onError', value : 'This is a error message'})
}}
 type="button" class="btn btn-danger">Show error msg</button>

