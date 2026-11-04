"""Every variant must return the same yearly biomass map (HKE, 2020) as the original file."""

import glob
import os
import sys

import numpy as np

work = sys.argv[1]
ref = np.load(os.path.join(work, "check_M1_original_index.npy"))
for p in sorted(glob.glob(os.path.join(work, "check_*.npy"))):
    a = np.load(p)
    same = a.shape == ref.shape and np.allclose(a, ref, rtol=1e-5, equal_nan=True)
    print(f"{os.path.basename(p)[6:-4]:32} {'same as original' if same else 'DIFFERENT'}  shape={a.shape} sum={np.nansum(a):.1f}")
