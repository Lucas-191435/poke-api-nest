import axios from "axios";

const PokeAPIClient = axios.create({
  baseURL: "https://pokeapi.co/api/v2/",
  headers: {
    "Content-Type": "application/json",
  },
});

export { PokeAPIClient };
