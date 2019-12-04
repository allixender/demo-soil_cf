<script>
  let soiltypequery_tq = "M''";
  let texturequery_tq = "ls";

  let soiltype_loading = false;
  let texture_loading = false;
  
  let soiltypequery_error = "";
  let texturequery_error = "";

  let soiltypequery_result = [];
  let texturequery_result = [];

  const special_chars = [
    '₁', '₂', '₃', '₄', '₅', '⁰'
  ];

  // async data fetching function
  async function querySoilType() {
    soiltype_loading = true;
    const q = { 'tq': soiltypequery_tq };
    const req_data = JSON.stringify(q);

    try {
      const response = await fetch(
        "https://europe-west1-glomodat.cloudfunctions.net/estsoil_cf",
        {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json"
          },
          body: req_data
        }
      );

      const data = await response.json();
      soiltypequery_result = [];
      for (const [key, value] of Object.entries(data)) {
        // console.log(key, value);
        soiltypequery_result.push({"name": key, "value": value});
      }
      soiltype_loading = false;
      // console.log(data)
      return data;
    } catch (err) {
      // catches errors both in fetch and response.json
      console.log(err.toString())
      soiltype_loading = false;
      soiltypequery_error = `${err.toString()}`;
    }
  }

  async function queryTexture() {
    texture_loading = true;
    const q = { 'tq': texturequery_tq };
    const req_data = JSON.stringify(q);

    try {
      const response = await fetch(
        "https://europe-west1-glomodat.cloudfunctions.net/estsoil_lm",
        {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json"
          },
          body: req_data
        }
      );

      const data = await response.json();
      texturequery_result = [];
      for (const [key, value] of Object.entries(data)) {
        // console.log(key, value);
        texturequery_result.push({"name": key, "value": value});
      }
      // console.log(data)
      texture_loading = false;
      return data;
    } catch (err) {
      // catches errors both in fetch and response.json
      console.log(err.toString())
      texture_loading = false;
      texturequery_error = `${err.toString()}`;
    }
  }
</script>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>

<main>
  <div class="container-fluid">
    <div class="row">
      <div class="col-8">
        <h1>Soil Texture Demo App</h1>

        <p>
          Visit the
          <a href="https://www.earth-syst-sci-data-discuss.net/essd-2019-192/">
            EstSoil-EH v1.0: An eco-hydrological modelling parameters dataset
            derived from the Soil Map of Estonia
          </a>
          to learn more about the dataset.
        </p>
      </div>
    </div>

    <div class="row">
      <div class="col-4">
        <form>
          <div class="form-group">
            <label for="soiltypequery">Soiltype / Siffer</label>
            <input
              type="text"
              class="form-control"
              bind:value={soiltypequery_tq}
              id="soiltypequery"
              aria-describedby="SoilTypeHelp" />
            {#if soiltypequery_error.length > 0}
              <small id="SoilTypeHelp" class="form-text" style="color: red;">
                {soiltypequery_error}
              </small>
            {/if}
          </div>
          <p>
            <a on:click={querySoilType} class="btn btn-primary">Submit</a>
            {#if soiltype_loading}
            <div class="spinner-border" role="status">
              <span class="sr-only">Querying...</span>
            </div>
            {/if}
          </p>
        </form>

        <div class="card">
            <div class="card-header">{soiltypequery_tq}</div>
            <ul class="list-group list-group-flush">
            {#each soiltypequery_result as elem}
              <li class="list-group-item">{elem.name} - {elem.value}</li>
            {/each}
              
            </ul>
        </div>

      </div>

      <div class="col-4">
        <form>
          <div class="form-group">
            <label for="texturequery">Texture / Lõimis</label>
            <input
              type="text"
              class="form-control"
              id="texturequery"
              bind:value={texturequery_tq} />
            
            {#each special_chars as cha}
              <a on:click={e => texturequery_tq = texturequery_tq.concat(cha)} class="btn btn-outline-secondary btn-sm">{cha}</a>
            {/each}
          </div>

          {#if texturequery_error.length > 0}
            <small id="TextureQueryHelp" class="form-text" style="color: red;">
              {texturequery_error}
            </small>
          {/if}

          <p>
            <a on:click={queryTexture} class="btn btn-primary">Submit</a>
            {#if texture_loading}
            <div class="spinner-border" role="status">
              <span class="sr-only">Querying...</span>
            </div>
            {/if}
          </p>
        </form>

        <div class="card">
          <div class="card-header">{texturequery_tq}</div>
            <ul class="list-group list-group-flush">
            {#each texturequery_result as elem}
              <li class="list-group-item">{elem.name} - {elem.value}</li>
            {/each}
        </div>
      </div>
    </div>
  </div>
</main>
