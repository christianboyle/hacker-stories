import * as React from 'react'
import axios from 'axios'
import styled from 'styled-components'
import { sortBy } from 'lodash'
import { ReactComponent as Check } from './check.svg'

const API_ENDPOINT = 'https://hn.algolia.com/api/v1/search?query='

const getUrl = (searchTerm) => `${API_ENDPOINT}${searchTerm}`

const extractSearchTerm = (url) => url.replace(API_ENDPOINT, '')

const getLastSearches = (urls) =>
  urls
    .reduce((result, url, index) => {
      const searchTerm = extractSearchTerm(url)

      if (index === 0) {
        return result.concat(searchTerm)
      }

      const previousSearchTerm = result[result.length - 1]

      if (searchTerm === previousSearchTerm) {
        return result
      } else {
        return result.concat(searchTerm)
      }
    }, [])
    .slice(-6)
    .slice(0, -1)

type Story = {
  title: string
  url: string
  author: string
  num_comments: number
  points: number
  objectID: number
}

type Stories = Story[]

type StoriesState = {
  data: Stories
  isLoading: boolean
  isError: boolean
}

type StoriesFetchInitAction = {
  type: 'STORIES_FETCH_INIT'
}

type StoriesFetchSuccessAction = {
  type: 'STORIES_FETCH_SUCCESS'
  payload: Stories
}

type StoriesFetchFailureAction = {
  type: 'STORIES_FETCH_FAILURE'
}

type StoriesRemoveAction = {
  type: 'REMOVE_STORY'
  payload: Story
}

type StoriesAction =
  | StoriesFetchInitAction
  | StoriesFetchSuccessAction
  | StoriesFetchFailureAction
  | StoriesRemoveAction

const storiesReducer = (state: StoriesState, action: StoriesAction) => {
  switch (action.type) {
    case 'STORIES_FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false
      }
    case 'STORIES_FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: action.payload
      }
    case 'STORIES_FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true
      }
    case 'REMOVE_STORY':
      return {
        ...state,
        data: state.data.filter(
          (story) => action.payload.objectID !== story.objectID
        )
      }
    default:
      throw new Error()
  }
}

const useStorageState = (
  key: string,
  initialState: string
): [string, (newValue: string) => void] => {
  const [value, setValue] = React.useState(
    localStorage.getItem(key) || initialState
  )

  React.useEffect(() => {
    localStorage.setItem(key, value)
  }, [value, key])

  return [value, setValue]
}

const StyledContainer = styled.div`
  height: 100vw;
  padding: 20px;
  background: #83a4d4;
  background: linear-gradient(to left, #b6fbff, #83a4d4);
  color: #171212;
`

const StyledHeadlinePrimary = styled.h1`
  font-size: 48px;
  font-weight: 300;
  letter-spacing: 2px;
`

const StyledItem = styled.li`
  display: flex;
  align-items: center;
  padding-bottom: 5px;
`

interface ButtonProps {
  width: string
}

const StyledColumn = styled.span<ButtonProps>`
  padding: 0 5px;
  white-space: nowrap;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  a {
    color: inherit;
  }
  width: ${(props) => props.width};
`

const StyledButton = styled.button`
  background: transparent;
  border: 1px solid #171212;
  padding: 5px;
  cursor: pointer;
  transition: all 0.1s ease-in;
  &:hover {
    background: #171212;
    color: #ffffff;
  }
`

const StyledButtonSmall = styled(StyledButton)`
  padding: 5px;
  &:hover svg path {
    fill: #ffffff;
    stroke: #ffffff;
  }
`

const StyledButtonLarge = styled(StyledButton)`
  padding: 10px;
`

const StyledSearchForm = styled.form`
  padding: 10px 0 20px 0;
  display: flex;
  align-items: baseline;
`

const StyledLabel = styled.label`
  border-top: 1px solid #171212;
  border-left: 1px solid #171212;
  padding-left: 5px;
  font-size: 24px;
`

const StyledInput = styled.input`
  border: none;
  border-bottom: 1px solid #171212;
  background-color: transparent;
  font-size: 24px;
`

const App = () => {
  const [searchTerm, setSearchTerm] = useStorageState('search', 'React')

  const [urls, setUrls] = React.useState([getUrl(searchTerm)])

  const [stories, dispatchStories] = React.useReducer(storiesReducer, {
    data: [],
    isLoading: false,
    isError: false
  })

  const handleFetchStories = React.useCallback(async () => {
    dispatchStories({ type: 'STORIES_FETCH_INIT' })

    try {
      const lastUrl = urls[urls.length - 1]
      const result = await axios.get(lastUrl)

      dispatchStories({
        type: 'STORIES_FETCH_SUCCESS',
        payload: result.data.hits
      })
    } catch {
      dispatchStories({ type: 'STORIES_FETCH_FAILURE' })
    }
  }, [urls])

  React.useEffect(() => {
    handleFetchStories()
  }, [handleFetchStories])

  const handleSearch = (searchTerm) => {
    const url = getUrl(searchTerm)
    setUrls(urls.concat(url))
  }

  const handleRemoveStory = (item: Story) => {
    dispatchStories({
      type: 'REMOVE_STORY',
      payload: item
    })
  }

  const handleSearchInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    handleSearch(searchTerm)

    event.preventDefault()
  }

  const handleLastSearch = (searchTerm) => {
    setSearchTerm(searchTerm)

    handleSearch(searchTerm)
  }

  const lastSearches = getLastSearches(urls)

  return (
    <StyledContainer>
      <StyledHeadlinePrimary>My Hacker Stories</StyledHeadlinePrimary>

      <SearchForm
        searchTerm={searchTerm}
        onSearchInput={handleSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />

      <LastSearches
        lastSearches={lastSearches}
        onLastSearch={handleLastSearch}
      />

      <hr />

      {stories.isError && <p>Something went wrong ...</p>}

      {stories.isLoading ? (
        <p>Loading ...</p>
      ) : (
        <List list={stories.data} onRemoveItem={handleRemoveStory} />
      )}
    </StyledContainer>
  )
}

const LastSearches = ({ lastSearches, onLastSearch }) => (
  <>
    {lastSearches.map((searchTerm, index) => (
      <button
        key={searchTerm + index}
        type='button'
        onClick={() => onLastSearch(searchTerm)}
      >
        {searchTerm}
      </button>
    ))}
  </>
)

type SearchFormProps = {
  searchTerm: string
  onSearchInput: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

const SearchForm: React.FC<SearchFormProps> = ({
  searchTerm,
  onSearchInput,
  onSearchSubmit
}) => (
  <StyledSearchForm onSubmit={onSearchSubmit}>
    <InputWithLabel
      id='search'
      value={searchTerm}
      isFocused
      onInputChange={onSearchInput}
    >
      <strong>Search:</strong>
    </InputWithLabel>

    <StyledButtonLarge type='submit' disabled={!searchTerm}>
      Submit
    </StyledButtonLarge>
  </StyledSearchForm>
)

type InputWithLabelProps = {
  id: string
  value: string
  type?: string
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  isFocused: boolean
  children: React.ReactNode
}

const InputWithLabel: React.FC<InputWithLabelProps> = ({
  id,
  value,
  type = 'text',
  onInputChange,
  isFocused,
  children
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isFocused])

  return (
    <>
      <StyledLabel htmlFor={id}>{children}</StyledLabel>
      &nbsp;
      <StyledInput
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        onChange={onInputChange}
      />
    </>
  )
}

type ListProps = {
  list: Stories
  onRemoveItem: (item: Story) => void
  sortKey: number
}

const SORTS = {
  NONE: (list) => list,
  TITLE: (list) => sortBy(list, 'title'),
  AUTHOR: (list) => sortBy(list, 'author'),
  COMMENT: (list) => sortBy(list, 'num_comments').reverse(),
  POINT: (list) => sortBy(list, 'points').reverse()
}

const List: React.FC<ListProps> = ({ list, onRemoveItem }) => {
  const [sort, setSort] = React.useState({
    sortKey: 'NONE',
    isReverse: false
  })

  const handleSort = (sortKey) => {
    const isReverse = sort.sortKey === sortKey && !sort.isReverse

    setSort({ sortKey, isReverse })
  }

  const sortFunction = SORTS[sort.sortKey]
  const sortedList = sort.isReverse
    ? sortFunction(list).reverse()
    : sortFunction(list)

  return (
    <ul>
      <li style={{ display: 'flex' }}>
        <span style={{ width: '40%' }}>
          <button type='button' onClick={() => handleSort('TITLE')}>
            Title
          </button>
        </span>
        <span style={{ width: '30%' }}>
          <button type='button' onClick={() => handleSort('AUTHOR')}>
            Author
          </button>
        </span>
        <span style={{ width: '10%' }}>
          <button type='button' onClick={() => handleSort('COMMENT')}>
            Comments
          </button>
        </span>
        <span style={{ width: '10%' }}>
          <button type='button' onClick={() => handleSort('POINT')}>
            Points
          </button>
        </span>
        <span style={{ width: '10%' }}>Actions</span>
      </li>

      {sortedList.map((item) => (
        <Item key={item.objectID} item={item} onRemoveItem={onRemoveItem} />
      ))}
    </ul>
  )
}

type ItemProps = {
  item: Story
  onRemoveItem: (item: Story) => void
}

const Item: React.FC<ItemProps> = ({ item, onRemoveItem }) => (
  <StyledItem>
    <StyledColumn width='40%'>
      <a href={item.url}>{item.title}</a>
    </StyledColumn>
    <StyledColumn width='30%'>{item.author}</StyledColumn>
    <StyledColumn width='10%'>{item.num_comments}</StyledColumn>
    <StyledColumn width='10%'>{item.points}</StyledColumn>
    <StyledColumn width='10%'>
      <StyledButtonSmall type='button' onClick={() => onRemoveItem(item)}>
        <Check height='18px' width='18px' />
      </StyledButtonSmall>
    </StyledColumn>
  </StyledItem>
)

export default App
