package com.edunexus.mobile;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** Exposes exactly one verified update file using a temporary OS URI grant. */
public final class UpdateFileProvider extends ContentProvider {
  @Override
  public boolean onCreate() {
    return true;
  }

  private File resolve(Uri uri) throws FileNotFoundException {
    if (getContext() == null
        || !"/update.apk".equals(uri.getPath())
        || uri.getQuery() != null
        || uri.getFragment() != null
        || !(getContext().getPackageName() + ".updates").equals(uri.getAuthority()))
      throw new FileNotFoundException("Update unavailable");
    File file = new File(getContext().getCacheDir(), "updates/EduNexus-release.apk");
    if (!file.isFile()) throw new FileNotFoundException("Update unavailable");
    return file;
  }

  @Override
  public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
    if (!"r".equals(mode)) throw new FileNotFoundException("Read only");
    return ParcelFileDescriptor.open(resolve(uri), ParcelFileDescriptor.MODE_READ_ONLY);
  }

  @Override
  public String getType(Uri uri) {
    return "application/vnd.android.package-archive";
  }

  @Override
  public Cursor query(
      Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
    try {
      File file = resolve(uri);
      String[] columns =
          projection == null
              ? new String[] {OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE}
              : projection;
      MatrixCursor cursor = new MatrixCursor(columns);
      Object[] values = new Object[columns.length];
      for (int i = 0; i < columns.length; i++) {
        if (OpenableColumns.DISPLAY_NAME.equals(columns[i])) values[i] = "EduNexus-release.apk";
        else if (OpenableColumns.SIZE.equals(columns[i])) values[i] = file.length();
      }
      cursor.addRow(values);
      return cursor;
    } catch (FileNotFoundException e) {
      return null;
    }
  }

  @Override
  public Uri insert(Uri uri, ContentValues values) {
    throw new UnsupportedOperationException("Read only");
  }

  @Override
  public int update(Uri uri, ContentValues values, String selection, String[] args) {
    throw new UnsupportedOperationException("Read only");
  }

  @Override
  public int delete(Uri uri, String selection, String[] args) {
    throw new UnsupportedOperationException("Read only");
  }
}
