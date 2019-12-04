<script>
  let soiltypequery_tq = "M''";
  let texturequery_tq = "ls";

  let soiltypequery_result = {};
  let texturequery_result = {};

  // async data fetching function
  async function querySoilType() {
    const req_data = JSON.stringify({ 'tq': soiltypequery_tq });
    const response = await fetch(
      "https://europe-west1-glomodat.cloudfunctions.net/estsoil_cf",
      {
        method: "POST",
        mode: 'cors',
        headers: {
          "Content-Type": "application/json"
        },
        body: req_data
      }
    );

    const data = await response.json();
    return data;
  };

  async function queryTexture() {
    const req_data = JSON.stringify({ 'tq': texturequery_tq });
    const response = await fetch(
      "https://europe-west1-glomodat.cloudfunctions.net/estsoil_lm",
      {
        method: "POST",
        mode: 'cors',
        headers: {
          "Content-Type": "application/json"
        },
        body: req_data
      }
    );

    const data = await response.json();
    return data;
  };
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
      <div class="col-4">
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
            <small id="SoilTypeHelp" class="form-text text-muted">
              We'll never share your email with anyone else.
            </small>
          </div>
          <a on:click={querySoilType} class="btn btn-primary">Submit</a>
        </form>

        <div class="card">
          {#if soiltypequery_result.soil_type}
            <div class="card-header">Featured</div>
            <ul class="list-group list-group-flush">
              <li class="list-group-item">Cras justo odio</li>
            </ul>
          {/if}
        </div>

      </div>
    </div>

    <div class="row">
      <div class="col-4">
        <form>
          <div class="form-group">
            <label for="texturequery">Texture / Lõimis</label>
            <input type="text" class="form-control" id="texturequery" bind:value={texturequery_tq} />
          </div>

          <small id="textureHelp" class="form-text text-muted">
            We'll never share your email with anyone else.
          </small>

          <a on:click={queryTexture} class="btn btn-primary">Submit</a>
        </form>

        <div class="card">
          {#if texturequery_result.Loimis1}
            <div class="card-header">Featured</div>
            <ul class="list-group list-group-flush">
              <li class="list-group-item">Cras justo odio</li>
              <li class="list-group-item">Dapibus ac facilisis in</li>
              <li class="list-group-item">Vestibulum at eros</li>
            </ul>
          {/if}
        </div>
      </div>
    </div>
  </div>
</main>
