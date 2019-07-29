"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" => VIM user interface
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
syntax on
set relativenumber
set number
set cursorline
set cursorcolumn
highlight CursorColumn ctermbg=lightcyan ctermfg=black

" Set the text width to 80 and create a vertical bar in 81st column.
set textwidth=80
set colorcolumn=81

"Always show current position
set ruler

" Highlight search results
set hlsearch

" Makes search act like search in modern browsers
set incsearch 

" Show matching brackets when text indicator is over them
set showmatch 
" How many tenths of a second to blink when matching brackets
set mat=2

" No annoying sound on errors
set noerrorbells
set novisualbell
set t_vb=
set tm=500

" Add a bit extra margin to the left
set foldcolumn=1

set background=dark
hi Comment ctermfg=lightblue


""""""""""""""""""""""""""""""
" => Status line
""""""""""""""""""""""""""""""

" Always show the status line
set laststatus=2

" Format the status line
set statusline=\ %{HasPaste()}%F%m%r%h\ %w\ \ CWD:\ %r%{getcwd()}%h\ \ \ Line:\ %l\ \ Column:\ %c


""""""""""""""""""""""""""""""
" => Keys
""""""""""""""""""""""""""""""

let mapleader = " "

noremap ; :
noremap k h
noremap n j
noremap e k
noremap i l
noremap l i

" Have backspace behave as it does in other applications.
set backspace=2

" Use <F10> to show diff since file save.
inoremap <F10> <c-o>:w !diff % -<cr>
nnoremap <F10> :w !diff % -<cr>

" Fast saving
nmap <leader>w :w!<cr>
