import React, { Component } from 'react';
import axios from 'axios';

const axiosGitHubGraphQl = axios.create({
  baseURL: 'https://api.github.com/graphql', //endpoint
  headers:{ //header da requisicao
    Authorization: `bearer ${
      process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN //variavel com o token dentro do .env
    }`,
  },
});
const TITLE = "React GraphQL Github Client";

const GET_ISSUES_OF_REPOSITORY = `
  query($organization:String!, $repository:String!, $cursor: String){
    organization(login: $organization){
      name
      url
      description
      repository(name: $repository){
        name
        url
        issues(last:5, after:$cursor, states:[OPEN]){
          totalCount
          edges{
            node{
              id
              title
              url
              reactions(last:3){
                edges{
                  node{
                    id
                    content
                  }
                }
              }
            }
          }
          totalCount
          pageInfo{
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
`; //usando o acento pois as aspas duplas estavam reservadas ao parametro da query
const getIssuesOfRepository = (path, cursor) => {
  const [organization,repository] = path.split('/');

  return axiosGitHubGraphQl.post('', {
    query: GET_ISSUES_OF_REPOSITORY,
    variables: {organization, repository, cursor},
  });
};

const resolveIssuesQuery = queryResult => () => ({
  organization : queryResult.data.data.organization, //pegando os dados da resposta do axios
  errors: queryResult.data.errors,
});

class App extends Component {
  state = {
    path: 'the-road-to-learn-react/the-road-to-learn-react',
    organization: null,
    errors: null, //devem ser preenchidos pelo POST do axios
  };

  componentDidMount() { //quando o componente for montado ele buscara os dados definidos
    // fetch data
    this.onFetchFromGithub(this.state.path);
  }

  onFetchFromGithub = (path, cursor) => {
    getIssuesOfRepository(path, cursor).then(queryResult =>
        this.setState(resolveIssuesQuery(queryResult, cursor)),
      );
     //o metodo vai fazer um POST da query definida mais acima
     //o payload vai ser a query definida mais acima
  };

  onChange = event => { //parametro => retorno (ou retorno + logica)
    this.setState({ path: event.target.value }); //caso haja uma mudança o metodo vai atualizar o path
  };

  onSubmit = event => {
    // fetch data
    this.onFetchFromGithub(this.state.path);
    event.preventDefault();
  };

  onFetchMoreIssues = () => {
    const {endCursor,} = this.state.organization.repository.issues.pageInfo;
    this.onFetchFromGithub(this.state.path, endCursor);
  };

  render() {
    const {path, organization, errors} = this.state; //ta reccebendo o state definido no inicio da classe
    return (
	     <div>
	       <h1>{TITLE}</h1>

         <form onSubmit={this.onSubmit}>
            <label htmlFor="url">
              Show open issues for https://github.com/
            </label>
            <input
              id="url"
              type="text"
              value={path} /*vai mostrar o path definido no state*/
              onChange={this.onChange}
              style={{width:'300px'}} />
            <button type="submit">Search</button>
         </form>

         <hr />

         {organization ? (
           <Organization organization={organization} errors={errors} onFetchMoreIssues={this.onFetchMoreIssues} />
         ) : (
           <p>No information yet...</p>
         )}
	     </div>

    );
  }
}

const Organization = ({organization, errors, onFetchMoreIssues,}) => {
  if(errors){
    return (
      <p>
        <strong>Something went wrong: </strong>
        {errors.map(error => error.message).join(' ')}
      </p>
    );
  }
   //definido uma tag personalizada para ser usado no render
   //description, databaseId, totalCout
  return(
    <div>
      <p>
        <strong>Issues from Organization: </strong>
        <a href={organization.url}>{organization.name}</a>
      </p>
      <p>
        {organization.description}
      </p>
      <Repository repository={organization.repository} onFetchMoreIssues={onFetchMoreIssues} />
    </div>
  );
};

const Repository = ({repository, onFetchMoreIssues,}) => (
  <div>
    <p>
      <strong>In Repository: </strong>
      <a href={repository.url}>{repository.name}</a>
    </p>
    <Issues issues={repository.issues} onFetchMoreIssues={onFetchMoreIssues} />
  </div>
);

const Issues = ({issues, onFetchMoreIssues,}) => (
  <div>
    <ul>
      <p>Total count of issues: {issues.totalCount}</p>
      <h3>List of issues:</h3>
      {issues.edges.map(issue => (
        <li key={issue.node.id}>
          <a href={issue.node.url}>{issue.node.title}</a>
          <ul>
            {issue.node.reactions.edges.map(reaction => (
              <li key={reaction.node.id}>{reaction.node.content}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>

    <hr />

    <button onClick={onFetchMoreIssues}>More</button>
  </div>
);

export default App;
