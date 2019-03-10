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
        id
        name
        url
        viewerHasStarred
        issues(first:5, after:$cursor, states:[OPEN]){
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

const ADD_STAR = `
  mutation($repositoryId: ID!){
    addStar(input : {starrableId:$repositoryId}){
      starrable{
        viewerHasStarred
      }
    }
  }
`

const getIssuesOfRepository = (path, cursor) => {
  const [organization,repository] = path.split('/');

  return axiosGitHubGraphQl.post('', {
    query: GET_ISSUES_OF_REPOSITORY,
    variables: {organization, repository, cursor},
  });
};
//pegando os dados da resposta do axios

const resolveIssuesQuery = (queryResult, cursor) => state => {
  const {data, errors} = queryResult.data;

  if(!cursor){
    return {
      organization : data.organization,
      errors,
    };
  }

  const {edges: oldIssues} = state.organization.repository.issues; //vem do estado inicial
  const {edges: newIssues} = data.organization.repository.issues; //vem da primeira query
  const updatedIssues = [...oldIssues, ...newIssues];//...nome = significa que o parametro pode receber varios valores

  return {
    organization: {
      ...data.organization,
      repository: {
        ...data.organization.repository,
        issues: {
          ...data.organization.repository.issues,
          edges: updatedIssues,
        },
      },
    },
    errors,
  };
};

const addStarRepository = repositoryId => {
  return axiosGitHubGraphQl.post('', {
    query : ADD_STAR,
    variables : {repositoryId},
  });
};

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
        //o estado vai ser mudado com a chamada de funcao acima.
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

  onStarRepository = (repositoryId, viewerHasStarred) => {
    addStarRepository(repositoryId);
  };

  //o type submit esta ligado ao onSubmit//
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
           <Organization organization={organization} errors={errors} onFetchMoreIssues={this.onFetchMoreIssues}
           onStarRepository={this.onStarRepository}/> //parametros passados para Organization
         ) : (
           <p>No information yet...</p>
         )}
	     </div>

    );
  }
}

const Organization = ({organization, errors, onFetchMoreIssues, onStarRepository,}) => {
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
      <Repository repository={organization.repository} onFetchMoreIssues={onFetchMoreIssues}
       onStarRepository={onStarRepository}/>
    </div>
  );
};

const Repository = ({repository, onFetchMoreIssues, onStarRepository,}) => (
  <div>
    <p>
      <strong>In Repository: </strong>
      <a href={repository.url}>{repository.name}</a>
    </p>
    <button type="button" onClick={() => onStarRepository(repository.id, repository.viewerHasStarred)}>
      {repository.viewerHasStarred?'Unstar':'Star'}
    </button>
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

    {issues.pageInfo.hasNextPage && ( /*so vai exibir o botao se existir uma proxima pagina*/
      <button onClick={onFetchMoreIssues}>More</button>
    )}
  </div>
);

export default App;
