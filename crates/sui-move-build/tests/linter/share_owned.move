// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module 0x42::test1 {
    use sui::transfer;
    use sui::object::UID;

    struct Obj has key, store {
        id: UID
    }

    public entry fun arg_object(o: Obj) {
        let arg = o;
        transfer::public_share_object(arg);
    }
}


module 0x42::test2 {
    use sui::transfer;
    use sui::object::{Self, UID};

    struct Obj has key, store {
        id: UID
    }

    struct Wrapper has key, store {
        id: UID,
        i: u32,
        o: Obj,
    }

    public entry fun unpack_obj(w: Wrapper) {
        let Wrapper { id, i: _, o } = w;
        transfer::public_share_object(o);
        object::delete(id);
    }
}
