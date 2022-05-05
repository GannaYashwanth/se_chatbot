<script>
    import { writable } from 'svelte/store';
	import { beforeUpdate, afterUpdate } from 'svelte';

    let res;
    let heading;
    let question;
    let answer ;
    let space
    let query = '' ;
    let loading = writable(false)
    let me;
	
    async function GET(){
		if (!query) return;
        
        heading.innerHTML = '<div></div>';
        question.innerHTML = '<div></div>';
        answer.innerHTML = '<div></div>';
        space.innerHTML = '<div></div>';


		loading.set(true)
        res = await fetch('https://fetch-query.herokuapp.com/' + query, {
			method: 'POST',
		}).then((x) => x.json());

        console.log("fetching done")
        console.log(res)
       
        loading.set(false)
        heading.innerHTML = res['heading']
        question.innerHTML = res['question']
        space.innerHTML = '<br>' + '<br>' + '<hr>'+ '<h3> Answer : <h3/> ' 
        answer.innerHTML = res['answer'];



    }
    function handleKeydown(event) {
		if (event.key === 'Enter') {
			const text = event.target.value;
			if (!text) return;
			GET();
	}
}


</script>

<svelte:head>
    <link rel="stylesheet" href="https://unpkg.com/@stackoverflow/stacks/dist/css/stacks.min.css">
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" integrity="sha384-JcKb8q3iqJ61gNV9KGb8thSsNjpSL0n8PARn9HuZOnIxN0hoP+VmmDGMN5t9UJ0Z" crossorigin="anonymous" />
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js" integrity="sha384-9/reFTGAW83EW2RDu2S0VKaIzap3H66lZH81PoYlFhbGU+6BZp6G7niu735Sk7lN" crossorigin="anonymous"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js" integrity="sha384-B4gt1jrGC7Jh4AgTPSdUtOBvfO8shuf57BaghqFfPlYxofvL8/KUEfYiJOMMV+rV" crossorigin="anonymous"></script>
    <script src="https://kit.fontawesome.com/5f59ca6ad3.js" crossorigin="anonymous"></script>
        
</svelte:head>

<style>
        .query-heading {
        margin: 8px;
        font-size: var(--fs-headline1);
        font-family: var(--theme-post-title-font-family);
        line-height: 1.35;
        font-weight: normal;
        margin-bottom: 0;
    }
    .question-answer{
        margin: 8px;
    }
    .user-input {
        background-color: #cbd2d9;
        font-family: "Roboto";
        font-weight: 900;
        height: 45px;
        border-width: 0;
        border-radius: 5px;
        margin: 8px;
        padding: 15px;
				width : 100%;
    }
    
    .send-msg-btn {
        background-color: #cbd2d9;
        font-family: "Roboto";
        height: 45px;
        border-width: 0;
        border-radius: 10px;
        margin: 8px;
        padding-left: 25px;
        padding-right: 25px;
    }
</style>


<div style="background-color: #e9ebf0; height : 100%">

    <div class="msg_box">
        <div class="d-flex flex-row ">
            <input class="user-input" id="userInput" bind:value={query} on:keydown={handleKeydown}>
            <button class="send-msg-btn" id="sendMsgBtn" on:click={()=>GET()}>
            <i class="fas fa-search"></i>
            </button>
        </div>
    </div>


    {#if $loading}
        <div>Loading ....</div>
    {:else}
        <div></div>
    {/if}


    <div class ="query-heading" bind:this={heading} ></div>
    <div class = "question-answer">
        <div bind:this={question}></div>
        <div bind:this={space}>
        </div>
        <div bind:this={answer}></div>

    </div>
</div>

