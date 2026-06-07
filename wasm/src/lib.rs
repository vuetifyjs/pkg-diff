//! Minimal WASM diff module.
//!
//! Exposes a tiny C-ABI surface (no wasm-bindgen) so the produced `.wasm`
//! can be loaded directly in a browser/worker with `WebAssembly.instantiate`.
//!
//! Memory protocol
//! ---------------
//! * `alloc(len) -> ptr`   — reserve `len` bytes, return pointer into linear memory.
//! * `dealloc(ptr, len)`   — release a block previously handed out.
//! * `diff(a_ptr, a_len, b_ptr, b_len) -> ptr`
//!       Inputs are UTF-8 byte ranges. The return pointer addresses a result
//!       block laid out as `[u32 len little-endian][len bytes of UTF-8]`.
//!       The body is a unified diff. The caller reads the length, copies the
//!       body out, then frees the block with `dealloc(ptr, 4 + len)`.

use std::alloc::{alloc as sys_alloc, dealloc as sys_dealloc, Layout};
use std::slice;

use similar::TextDiff;

/// Reserve `len` bytes of linear memory and return a raw pointer to it.
#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    if len == 0 {
        return std::ptr::null_mut();
    }
    // 1-byte alignment is fine for the UTF-8 byte buffers we pass around.
    let layout = Layout::from_size_align(len, 1).unwrap();
    unsafe { sys_alloc(layout) }
}

/// Free a block previously returned by `alloc` (or the `diff` result block).
#[no_mangle]
pub extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    if ptr.is_null() || len == 0 {
        return;
    }
    let layout = Layout::from_size_align(len, 1).unwrap();
    unsafe { sys_dealloc(ptr, layout) }
}

/// Compute a unified diff between two UTF-8 buffers.
///
/// Returns a pointer to a `[u32 len][bytes]` result block (see module docs).
#[no_mangle]
pub extern "C" fn diff(a_ptr: *const u8, a_len: usize, b_ptr: *const u8, b_len: usize) -> *mut u8 {
    let a = bytes_to_str(a_ptr, a_len);
    let b = bytes_to_str(b_ptr, b_len);

    let patch = TextDiff::from_lines(a, b)
        .unified_diff()
        .context_radius(3)
        .to_string();

    let body = patch.as_bytes();
    let total = 4 + body.len();

    let out = alloc(total);
    unsafe {
        let header = (body.len() as u32).to_le_bytes();
        std::ptr::copy_nonoverlapping(header.as_ptr(), out, 4);
        std::ptr::copy_nonoverlapping(body.as_ptr(), out.add(4), body.len());
    }
    out
}

fn bytes_to_str<'a>(ptr: *const u8, len: usize) -> &'a str {
    if ptr.is_null() || len == 0 {
        return "";
    }
    let bytes = unsafe { slice::from_raw_parts(ptr, len) };
    // Inputs may not be valid UTF-8 (binary files are filtered out caller-side,
    // but be defensive): fall back to an empty view rather than panicking.
    std::str::from_utf8(bytes).unwrap_or("")
}
