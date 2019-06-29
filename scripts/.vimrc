syntax on
set relativenumber
set number
set background=dark
hi Comment ctermfg=lightblue

let mapleader = " "

noremap k h
noremap n j
noremap e k
noremap i l

set cursorline
set cursorcolumn
highlight CursorColumn ctermbg=lightcyan ctermfg=black

" Set the text width to 80 and create a vertical bar in 81st column.
set textwidth=80
set colorcolumn=81

" Have backspace behave as it does in other applications.
set backspace=2

" Use <F10> to show diff since file save.
inoremap <F10> <c-o>:w !diff % -<cr>
nnoremap <F10> :w !diff % -<cr>
